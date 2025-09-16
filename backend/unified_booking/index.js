exports.handler = async (event) => {
  const method = event && event.requestContext && event.requestContext.http ? event.requestContext.http.method : (event && event.httpMethod) || "GET";
  const path   = event && event.rawPath ? event.rawPath : (event && event.path) || "/";
  if (method === "OPTIONS") return send(200, { ok: true });
  if (path === "/ping")     return send(200, { ok: true, func: "unified_booking", ts: new Date().toISOString() });
  return send(404, { error: "Not found" });

  function send(status, body) {
    return {
      statusCode: status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
      },
      body: JSON.stringify(body)
    };
  }
};
