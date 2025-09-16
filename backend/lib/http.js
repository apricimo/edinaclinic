const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

function send(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: statusCode === 204 ? "" : JSON.stringify(body ?? {})
  };
}

function parseJsonBody(event) {
  if (!event || !event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = {
  send,
  parseJsonBody
};
