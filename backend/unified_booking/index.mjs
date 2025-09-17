import http from "../lib/http.js";

const { send } = http;

let bookingModulePromise;
let providersModulePromise;
let appointmentsModulePromise;

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const rawPath = event?.rawPath || event?.path || "/";

  if (method === "OPTIONS") return send(200, { ok: true });
  const { path: normalizedPath } = normalizePath(rawPath, ["ping", "checkout", "services", "providers", "appointments", "slots"]);

  if (method === "GET" && normalizedPath === "/ping") {
    return send(200, { ok: true, func: "unified_booking", ts: new Date().toISOString() });
  }
  if (normalizedPath.startsWith("/services/preferences")) {
    const appointmentsHandler = await loadAppointmentsHandler();
    const routedEvent = { ...event, rawPath: normalizedPath, path: normalizedPath };
    return appointmentsHandler(routedEvent);
  }

  if (normalizedPath.startsWith("/checkout") || normalizedPath.startsWith("/services") && !normalizedPath.startsWith("/services/preferences")) {
    const bookingHandler = await loadBookingHandler();
    const routedEvent = { ...event, rawPath: normalizedPath, path: normalizedPath };
    return bookingHandler(routedEvent);
  }

  if (normalizedPath.startsWith("/appointments") || normalizedPath.startsWith("/slots")) {
    const appointmentsHandler = await loadAppointmentsHandler();
    const routedEvent = { ...event, rawPath: normalizedPath, path: normalizedPath };
    return appointmentsHandler(routedEvent);
  }

  if (normalizedPath.startsWith("/providers")) {
    const providersHandler = await loadProvidersHandler();
    const routedEvent = { ...event, rawPath: normalizedPath, path: normalizedPath };
    return providersHandler(routedEvent);
  }

  return send(404, { error: "Not found" });
};

async function loadBookingHandler() {
  if (!bookingModulePromise) {
    bookingModulePromise = import("../booking_api/index.mjs");
  }
  const module = await bookingModulePromise;
  if (typeof module.handler !== "function") {
    throw new Error("booking_api.index.mjs must export handler");
  }
  return module.handler;
}

function normalizePath(rawPath, knownRoots = []) {
  if (!rawPath) return { path: "/" };
  const cleanRoots = new Set(knownRoots);
  const segments = rawPath.split("/").filter(Boolean);
  if (segments.length > 0 && !cleanRoots.has(segments[0]) && segments.length > 1) {
    segments.shift();
  }
  const normalised = segments.length ? `/${segments.join("/")}` : "/";
  return { path: normalised };
}

async function loadAppointmentsHandler() {
  if (!appointmentsModulePromise) {
    appointmentsModulePromise = import("../appointments_api/index.mjs");
  }
  const module = await appointmentsModulePromise;
  if (typeof module.handler !== "function") {
    throw new Error("appointments_api.index.mjs must export handler");
  }
  return module.handler;
}

async function loadProvidersHandler() {
  if (!providersModulePromise) {
    providersModulePromise = import("../providers_api/index.mjs");
  }
  const module = await providersModulePromise;
  if (typeof module.handler !== "function") {
    throw new Error("providers_api.index.mjs must export handler");
  }
  return module.handler;
}
