import { describe, expect, it } from "vitest";

import { parseJsonBody, send } from "./http.js";

describe("http helpers", () => {
  it("wraps response", () => {
    const response = send(200, { ok: true });

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("https://edinaclinic.com");
    expect(response.body).toBe(JSON.stringify({ ok: true }));
  });

  it("parses JSON body strings", () => {
    const payload = parseJsonBody({ body: '{"value":42}' });

    expect(payload).toEqual({ value: 42 });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonBody({ body: "{" })).toThrowError("Invalid JSON body");
  });
});
