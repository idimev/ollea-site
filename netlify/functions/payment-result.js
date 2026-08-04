// Receives the bank's POST after 3-D Secure (okUrl and failUrl both point
// here), verifies the HashV3 response signature, then redirects the shopper.

const crypto = require("crypto");

const STORE_KEY = process.env.HALKBANK_STORE_KEY;
const SITE_URL = (process.env.SITE_URL || "https://ollea.mk").replace(/\/$/, "");

// Успешното плаќање се пријавува како Netlify Forms поднесок (формата
// „payment" е декларирана во payment-success.html). Така добивате е-порака
// веднаш, а записот стои до самата нарачка со истиот број.
// Никогаш не смее да го спречи или одложи пренасочувањето на купувачот.
async function notifyPaid(details) {
  const body = new URLSearchParams({
    "form-name": "payment",
    "Број на нарачка": details.oid || "",
    "Износ": details.amount || "",
    "Авторизација": details.authCode || "",
    "Трансакција": details.transId || "",
    "Картичка": details.maskedPan || "",
    "Статус": "Успешно платено",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${SITE_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("Payment notification rejected:", res.status, details.oid);
    }
  } catch (err) {
    // Плаќањето е веќе успешно — само известувањето падна.
    console.warn("Payment notification failed:", err.message, details.oid);
  } finally {
    clearTimeout(timer);
  }
}

const escapeVal = (v) => String(v).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

function hashV3(params, storeKey) {
  const keys = Object.keys(params)
    .filter((k) => !["hash", "encoding"].includes(k.toLowerCase()))
    .sort((a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
  const plaintext =
    keys.map((k) => escapeVal(params[k])).join("|") + "|" + escapeVal(storeKey);
  return crypto.createHash("sha512").update(plaintext, "utf8").digest("base64");
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const redirect = (path) => ({
  statusCode: 303,
  headers: { Location: path, "Cache-Control": "no-store" },
  body: "",
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return redirect("/");
  if (!STORE_KEY) return redirect("/payment-failed.html?reason=config");

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";
  const p = Object.fromEntries(new URLSearchParams(raw));

  const oid = p.oid || p.ReturnOid || "";

  // 1) Verify the response came from the bank
  const received = p.HASH || p.hash || "";
  const expected = hashV3(p, STORE_KEY);
  if (!received || !safeEqual(received, expected)) {
    console.warn("HASH mismatch — possible tampering. Order:", oid);
    return redirect(
      `/payment-failed.html?oid=${encodeURIComponent(oid)}&reason=verification`
    );
  }

  // 2) Check 3-D Secure + authorisation result
  const md = String(p.mdStatus || "");
  const threeDOk = ["1", "2", "3", "4"].includes(md);
  const approved =
    p.Response === "Approved" && String(p.ProcReturnCode) === "00";

  if (threeDOk && approved) {
    console.log("Payment approved:", {
      oid,
      amount: p.amount,
      AuthCode: p.AuthCode,
      TransId: p.TransId,
      maskedPan: p.MaskedPan,
    });
    // Купувачот е веќе наплатен — известувањето не смее да падне со него,
    // затоа notifyPaid никогаш не фрла грешка.
    await notifyPaid({
      oid,
      amount: p.amount,
      authCode: p.AuthCode,
      transId: p.TransId,
      maskedPan: p.MaskedPan,
    });
    return redirect(
      `/payment-success.html?oid=${encodeURIComponent(oid)}&auth=${encodeURIComponent(p.AuthCode || "")}`
    );
  }

  const msg = p.ErrMsg || p.mdErrorMsg || p.Response || "Payment was declined";
  console.warn("Payment failed:", {
    oid,
    mdStatus: md,
    ProcReturnCode: p.ProcReturnCode,
    Response: p.Response,
    msg,
  });
  return redirect(
    `/payment-failed.html?oid=${encodeURIComponent(oid)}&reason=${encodeURIComponent(String(msg).slice(0, 200))}`
  );
};
