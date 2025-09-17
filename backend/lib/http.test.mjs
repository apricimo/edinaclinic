it("wraps response", () => {
  const response = send(200, { ok: true });

  expect(response.statusCode).toBe(200);
  expect(response.headers["Access-Control-Allow-Origin"]).toBe("https://edinaclinic.com");
  expect(response.body).toBe(JSON.stringify({ ok: true }));
});
