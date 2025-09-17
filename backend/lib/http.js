const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "https://edinaclinic.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
};

function send(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}
