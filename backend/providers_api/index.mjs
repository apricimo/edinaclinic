// providers_api/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

/* ---------- config ---------- */
const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.PROVIDERS_TABLE || "providers";
const ROUTE_ROOTS = ["/ping", "/providers"];
const ALLOWED_FIELDS = ["name", "provider_name", "first_name", "last_name", "priority"];

/* ---------- http helpers ---------- */
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "https://edinaclinic.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function send(statusCode, body) {
  return { statusCode, headers: DEFAULT_HEADERS, body: JSON.stringify(body) };
}
const ok = (body) => send(200, body);
const badRequest = (msg) => send(400, { error: msg || "Bad Request" });
const notFound = (msg) => send(404, { error: msg || "Not found" });
const serverError = (msg) => send(500, { error: msg || "Server error" });

/* ---------- db ---------- */
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const providerPk = (id) => `PROVIDER#${id}`;
const cuid = () => crypto.randomUUID();

/* ---------- utils ---------- */
function parseJson(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
const optionalString = (v) => (typeof v === "string" && v.trim().length ? v.trim() : undefined);

/* ---------- handlers ---------- */
export async function handler(event) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const path = event?.rawPath || event?.path || "/";

  if (method === "OPTIONS") return ok({ ok: true });
  if (path === "/ping") return ok({ ok: true, func: "providers_api", ts: new Date().toISOString() });

  if (path.startsWith("/providers")) {
    const id = event?.pathParameters?.id || path.split("/")[2];

    if (method === "POST" && (path === "/providers" || path === "/providers/")) {
      return createProvider(event);
    }
    if (method === "PATCH" && id) {
      return updateProvider(id, event);
    }
  }

  return notFound("Route not found");
}

/* ---------- create ---------- */
async function createProvider(event) {
  const body = parseJson(event.body);
  if (body === null) return badRequest("Invalid JSON body");

  const firstName = optionalString(body.first_name);
  const lastName = optionalString(body.last_name);
  const providerName = optionalString(body.provider_name);
  const explicitName = optionalString(body.name);
  const priority = body.priority !== undefined ? Number(body.priority) : undefined;

  const id = body.provider_id || cuid();

  const displayFromParts = [firstName, lastName].filter(Boolean).join(" ");
  const name = explicitName || providerName || displayFromParts || `Provider ${id}`;

  const item = {
    pk: providerPk(id),
    sk: "v0",
    id,
    name,
    provider_name: name,
    provider_id: id,
    first_name: firstName,
    last_name: lastName,
  };
  if (!Number.isNaN(priority)) item.priority = priority;

  try {
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return ok({ provider: item });
  } catch (error) {
    console.error("providers_api: create failed", error);
    return serverError("Failed to create provider");
  }
}

/* ---------- update ---------- */
async function updateProvider(id, event) {
  const payload = parseJson(event.body);
  if (payload === null) return badRequest("Invalid JSON body");

  let existing;
  try {
    const out = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: providerPk(id), sk: "v0" } })
    );
    existing = out.Item;
  } catch (error) {
    console.error("providers_api: load existing failed", error);
    return serverError("Failed to update provider");
  }
  if (!existing) return notFound("Provider not found");

  const updates = {};
  const touched = {};

  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) {
      touched[key] = true;
      let value = payload[key];
      if (key === "priority") value = Number(value);
      if (value !== undefined && value !== null && value !== "") updates[key] = value;
    }
  }

  const firstTouched = Boolean(touched.first_name);
  const lastTouched = Boolean(touched.last_name);
  const nameTouched = Boolean(touched.name);
  const providerNameTouched = Boolean(touched.provider_name);

  if (nameTouched || providerNameTouched || firstTouched || lastTouched) {
    const existingFirst = optionalString(existing.first_name);
    const existingLast = optionalString(existing.last_name);
    const existingDisplay =
      optionalString(existing.name) || optionalString(existing.provider_name) || undefined;

    const nextFirst = updates.first_name !== undefined ? updates.first_name : existingFirst;
    const nextLast = updates.last_name !== undefined ? updates.last_name : existingLast;

    let nextName = updates.name;
    if (!nextName && providerNameTouched && updates.provider_name) {
      nextName = updates.provider_name;
    }
    if (!nextName) {
      const parts = [nextFirst, nextLast].filter(Boolean);
      if (parts.length) nextName = parts.join(" ");
    }
    if (!nextName) nextName = existingDisplay;

    if (nextName) {
      updates.name = nextName;
      updates.provider_name = nextName;
    }
  }

  if (!Object.keys(updates).length) return badRequest("No updatable fields supplied");

  const exprNames = {};
  const exprValues = {};
  const sets = [];
  let i = 0;
  for (const [k, v] of Object.entries(updates)) {
    const nk = `#k${i}`;
    const nv = `:v${i}`;
    exprNames[nk] = k;
    exprValues[nv] = v;
    sets.push(`${nk} = ${nv}`);
    i += 1;
  }

  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: providerPk(id), sk: "v0" },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: "ALL_NEW",
      })
    );
    return ok({ provider: res.Attributes });
  } catch (error) {
    console.error("providers_api: update failed", error);
    return serverError("Failed to update provider");
  }
}
