// Builds the NestPay (Halkbank MK) 3D_PAY_HOSTING payment form, signs it with
// HashV3 and auto-submits it so the shopper lands on the bank's card page.
//
// The charged amount is computed HERE from content/products.json — the browser
// sends only product identifiers and quantities, never a price.

const crypto = require("crypto");

// Static requires so zip-it-and-ship-it bundles the JSON with the function.
// Both files are edited through Decap CMS, so prices/fees stay a single source
// of truth: a CMS save triggers a rebuild and this function picks them up.
const catalog = require("../../content/products.json");
const settings = require("../../content/settings.json");

const GATE_URL = process.env.HALKBANK_GATE_URL ||
  "https://torus-stage-halkbankmacedonia.asseco-see.com.tr/fim/est3Dgate";
const CLIENT_ID = process.env.HALKBANK_CLIENT_ID;
const STORE_KEY = process.env.HALKBANK_STORE_KEY;
const SITE_URL = (process.env.SITE_URL || "https://ollea.mk").replace(/\/$/, "");

// Delivery rule (mirrored in js/cart.js so the shopper sees the same total).
const DELIVERY_FEE = num(settings?.payment?.deliveryFee, 130);
const FREE_DELIVERY_OVER = num(settings?.payment?.freeDeliveryOver, 1200);

const MAX_QTY = 99;      // per line
const MAX_LINES = 50;    // distinct products per order

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ---------- HashV3 (Payten / NestPay) --------------------------------------
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

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// ---------- Cart pricing (server-side, authoritative) -----------------------
const products = Array.isArray(catalog?.products) ? catalog.products : [];

function findProduct(ref) {
  const key = String(ref == null ? "" : ref).trim();
  if (!key) return null;
  return (
    products.find((p) => p.slug === key) ||
    products.find((p) => p.name === key) ||
    null
  );
}

// Accepts [{slug|name|id, qty}] and returns the authoritative money figures.
// Throws on anything it cannot price — never guesses.
function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Кошничката е празна.");
  }
  if (items.length > MAX_LINES) {
    throw new Error("Премногу ставки во кошничката.");
  }

  const lines = [];
  let subtotal = 0;

  for (const item of items) {
    const product = findProduct(item?.slug ?? item?.name ?? item?.id);
    if (!product) {
      throw new Error("Непознат производ во кошничката.");
    }
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Производот „${product.name}" нема валидна цена.`);
    }

    const qty = Math.floor(Number(item?.qty ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      throw new Error("Невалидна количина.");
    }

    subtotal += price * qty;
    lines.push({ name: product.name, slug: product.slug, price, qty });
  }

  const delivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  return { lines, subtotal, delivery, total: subtotal + delivery };
}

// Order ids are generated in the browser so the Netlify Forms record and the
// bank transaction share one reference. Validate the shape before it reaches
// the hash or the HTML.
const OID_RE = /^OLLEA-\d{10,16}-[A-Z0-9]{4,12}$/;

function newOid() {
  return (
    "OLLEA-" + Date.now() + "-" +
    crypto.randomBytes(3).toString("hex").toUpperCase()
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!CLIENT_ID || !STORE_KEY) {
    return {
      statusCode: 500,
      body: "Payment is not configured yet (missing environment variables).",
    };
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";
  const ctype = ((event.headers || {})["content-type"] || "").toLowerCase();

  let input = {};
  if (ctype.includes("application/json")) {
    try { input = JSON.parse(raw); } catch { input = {}; }
  } else {
    input = Object.fromEntries(new URLSearchParams(raw));
  }

  // `items` arrives as a JSON string from the urlencoded form post.
  let items = input.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = null; }
  }

  let cart;
  try {
    cart = priceCart(items);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: err.message,
    };
  }

  // Belt and braces: the gateway must never see an absurd figure.
  if (!Number.isFinite(cart.total) || cart.total <= 0 || cart.total > 500000) {
    return { statusCode: 400, body: "Invalid amount." };
  }
  const amount = cart.total.toFixed(2); // e.g. "1490.00" (MKD)

  const oid = OID_RE.test(String(input.oid || "")) ? String(input.oid) : newOid();

  const params = {
    clientid: CLIENT_ID,
    storetype: "3d_pay_hosting",
    trantype: "Auth",
    amount,
    currency: "807", // MKD
    oid,
    okUrl: `${SITE_URL}/.netlify/functions/payment-result`,
    failUrl: `${SITE_URL}/.netlify/functions/payment-result`,
    lang: "en", // try "mk" once testable
    rnd: crypto.randomBytes(16).toString("hex"),
    hashAlgorithm: "ver3",
    refreshtime: "5",
  };

  const hash = hashV3(params, STORE_KEY);

  // "encoding" is POSTed but is NOT part of the hash
  const fields = { ...params, hash, encoding: "UTF-8" };

  const inputs = Object.entries(fields)
    .map(([k, v]) =>
      `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
    .join("\n      ");

  console.log("Payment initiated:", {
    oid,
    amount,
    subtotal: cart.subtotal,
    delivery: cart.delivery,
    lines: cart.lines.map((l) => `${l.qty}× ${l.name}`),
  });

  const html = `<!doctype html>
<html lang="mk">
  <head><meta charset="utf-8"><title>Пренасочување…</title></head>
  <body onload="document.forms[0].submit()" style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;color:#4a3f52;">
    <p>Ве пренасочуваме кон безбедната страница на банката…</p>
    <form action="${escapeHtml(GATE_URL)}" method="POST">
      ${inputs}
      <noscript><button type="submit">Продолжи кон плаќање</button></noscript>
    </form>
  </body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: html,
  };
};
