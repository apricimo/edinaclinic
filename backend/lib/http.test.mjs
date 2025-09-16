import { describe, it, expect } from "vitest";
import http from "./http.js";

const { parseJsonBody, send } = http;

describe("parseJsonBody", () => {
  it("parses JSON payloads", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(parseJsonBody({ body })).toEqual({ hello: "world" });
  });

  it("parses base64 payloads", () => {
    const payload = Buffer.from(JSON.stringify({ ok: true })).toString("base64");
    expect(parseJsonBody({ body: payload, isBase64Encoded: true })).toEqual({ ok: true });
  });

  it("returns empty object when body missing", () => {
    expect(parseJsonBody({})).toEqual({});
  });
});

describe("send", () => {
  it("wraps response", () => {
    const response = send(200, { ok: true });
    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(response.body).toBe(JSON.stringify({ ok: true }));
  });

  it("omits body for 204", () => {
    const response = send(204);
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });
});
