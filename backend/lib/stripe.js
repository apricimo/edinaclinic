const https = require("node:https");

const agent = new https.Agent({ keepAlive: true });

async function createCheckoutSession({ price, name, successUrl, cancelUrl, apiKey, metadata }) {
  if (!apiKey) {
    throw new Error("Stripe API key is missing");
  }
  if (!price || typeof price.amount !== "number" || !price.currency) {
    throw new Error("Price must include amount and currency");
  }
  if (!name) {
    throw new Error("Product name is required");
  }
  if (!successUrl || !cancelUrl) {
    throw new Error("Checkout redirect URLs are required");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.append("line_items[0][price_data][currency]", price.currency);
  params.append("line_items[0][price_data][product_data][name]", name);
  params.append("line_items[0][price_data][unit_amount]", String(price.amount));
  params.append("line_items[0][quantity]", "1");

  if (metadata && typeof metadata === "object") {
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;
      params.append(`metadata[${key}]`, String(value));
    }
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    agent
  });

  const bodyText = await response.text();
  let payload;
  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch (error) {
    throw new Error(`Stripe response was not JSON: ${error.message}`);
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Stripe error ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.body = payload;
    throw err;
  }

  if (!payload || !payload.url) {
    throw new Error("Stripe response missing checkout URL");
  }

  return payload;
}

module.exports = {
  createCheckoutSession
};
