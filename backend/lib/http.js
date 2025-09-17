const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "https://edinaclinic.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
};

function send(statusCode, body = {}) {
  const payload = body ?? {};
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(event = {}) {
  const hasBody = typeof event === "object" && event !== null && Object.prototype.hasOwnProperty.call(event, "body");
  const raw = hasBody ? event.body : event;
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const err = new Error("Invalid JSON body");
      err.cause = error;
      throw err;
    }
  }
  if (typeof raw === "object") {
    return raw;
  }
  return {};
}

export { send, parseJsonBody };
export default { send, parseJsonBody };
