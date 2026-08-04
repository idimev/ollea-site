// Receives the bank's POST after 3-D Secure (okUrl and failUrl both point
// here), verifies the HashV3 response signature, then redirects the shopper.

const crypto = require("crypto");

const STORE_KEY = process.env.HALKBANK_STORE_KEY;

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
    // TODO: record the order as PAID here (email notification / DB / webhook).
    // The customer's details are already in Netlify Forms under the same order
    // number (field "Број на нарачка"), so matching is by `oid`.
    console.log("Payment approved:", {
      oid,
      amount: p.amount,
      AuthCode: p.AuthCode,
      TransId: p.TransId,
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
