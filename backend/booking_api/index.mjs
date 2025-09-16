import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import http from "../lib/http.js";
import stripeLib from "../lib/stripe.js";
import secretsLib from "../lib/secrets.js";

const { send, parseJsonBody } = http;
const { createCheckoutSession } = stripeLib;
const { getSecretString } = secretsLib;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesPath = path.resolve(__dirname, "../../data/services.json");

const servicesData = loadServices(servicesPath);
const serviceLookup = buildServiceLookup(servicesData);

export async function handler(event) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const rawPath = event?.rawPath || event?.path || "/";
  const { path: normalizedPath } = normalizePath(rawPath, ["ping", "services", "checkout"]);

  if (method === "OPTIONS") return send(200, { ok: true });
  if (method === "GET" && normalizedPath === "/ping") {
    return send(200, { ok: true, api: "booking", ts: new Date().toISOString() });
  }
  if (method === "GET" && normalizedPath === "/services") {
    return send(200, { services: servicesData });
  }
  if (method === "POST" && normalizedPath === "/checkout") {
    return handleCheckout({ ...event, rawPath: normalizedPath, path: normalizedPath });
  }

  return send(404, { error: "Not found" });
}

async function handleCheckout(event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    console.error("booking_api: invalid checkout body", error);
    return send(400, { error: "Invalid request body" });
  }

  const serviceId = payload?.service_id;
  if (!serviceId || typeof serviceId !== "string") {
    return send(400, { error: "service_id is required" });
  }

  const service = findService(serviceId);
  if (!service) {
    return send(400, { error: "Unknown service_id" });
  }

  const successUrl = process.env.CHECKOUT_SUCCESS_URL;
  const cancelUrl = process.env.CHECKOUT_CANCEL_URL;
  if (!successUrl || !cancelUrl) {
    console.error("booking_api: missing checkout URLs");
    return send(500, { error: "Checkout not configured" });
  }

  let apiKey;
  try {
    apiKey = await getSecretString({
      envKeyName: ["STRIPE_API_KEY", "STRIPE_SECRET"],
      secretNameEnv: ["STRIPE_SECRET_ARN", "STRIPE_SECRET_NAME"]
    });
  } catch (error) {
    console.error("booking_api: unable to load Stripe API key", error);
    return send(500, { error: "Checkout not available" });
  }

  try {
    const session = await createCheckoutSession({
      price: service.price,
      name: service.name,
      successUrl,
      cancelUrl,
      apiKey,
      metadata: { service_id: service.id }
    });
    return send(200, { checkout_url: session.url });
  } catch (error) {
    console.error("booking_api: checkout session error", error);
    return send(502, { error: "Failed to create checkout session" });
  }
}

function loadServices(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        aliases: item.aliases || [],
        description: item.description || "",
        duration_min: item.duration_min
      }));
    }
  } catch (error) {
    console.error("booking_api: unable to load services file", error);
  }
  return [];
}

function buildServiceLookup(services) {
  const map = new Map();
  for (const service of services) {
    if (!service?.id) continue;
    register(map, service.id, service);
    const aliases = Array.isArray(service.aliases) ? service.aliases : [];
    for (const alias of aliases) {
      if (!alias) continue;
      register(map, alias, service);
    }
  }
  return map;
}

function register(map, key, service) {
  if (typeof key !== "string") return;
  map.set(key, service);
  map.set(key.toLowerCase(), service);
}

function findService(identifier) {
  const direct = serviceLookup.get(identifier);
  if (direct) return direct;
  if (typeof identifier === "string") {
    return serviceLookup.get(identifier.toLowerCase());
  }
  return undefined;
}

function normalizePath(rawPath, knownRoots = []) {
  if (!rawPath) return { path: "/" };
  const roots = new Set(knownRoots);
  const segments = rawPath.split("/").filter(Boolean);
  if (segments.length > 0 && !roots.has(segments[0]) && segments.length > 1) {
    segments.shift();
  }
  const normalised = segments.length ? `/${segments.join("/")}` : "/";
  return { path: normalised };
}
