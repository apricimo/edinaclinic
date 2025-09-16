import http from "../lib/http.js";
import ddb from "../lib/ddb.js";

const { send, parseJsonBody } = http;
const { getItem, putItem, updateItem, deleteItem, scanItems } = ddb;

const TABLE_NAME = process.env.PROVIDERS_TABLE || "providers";

const ROUTE_ROOTS = ["ping", "providers"];
const ALLOWED_FIELDS = [
  "name",
  "first_name",
  "last_name",
  "priority",
  "email",
  "phone",
  "services",
  "availability",
  "bio",
  "photoUrl"
];

export async function handler(event) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const rawPath = event?.rawPath || event?.path || "/";
  const { path: normalizedPath, segments } = normalizePath(rawPath, ROUTE_ROOTS);

  if (method === "OPTIONS") return send(200, { ok: true });
  if (method === "GET" && normalizedPath === "/ping") {
    return send(200, { ok: true, api: "providers", ts: new Date().toISOString() });
  }

  try {
    if (method === "GET" && normalizedPath === "/providers") {
      return await listProviders();
    }

    if (method === "GET" && segments[0] === "providers" && segments[1]) {
      return await fetchProvider(segments[1]);
    }

    if (method === "POST" && normalizedPath === "/providers") {
      return await createProvider(event);
    }

    if (method === "PUT" && segments[0] === "providers" && segments[1]) {
      return await updateProvider(segments[1], event);
    }

    if (method === "DELETE" && segments[0] === "providers" && segments[1]) {
      return await removeProvider(segments[1]);
    }
  } catch (error) {
    console.error("providers_api: unexpected error", error);
    return send(500, { error: "Internal error" });
  }

  return send(404, { error: "Not found" });
}

async function listProviders() {
  try {
    const result = await scanItems({ TableName: TABLE_NAME });
    const items = result.Items || [];
    const providers = items
      .map(formatProvider)
      .sort((a, b) => {
        const ap = typeof a.priority === "number" ? a.priority : Number.MAX_SAFE_INTEGER;
        const bp = typeof b.priority === "number" ? b.priority : Number.MAX_SAFE_INTEGER;
        if (ap === bp) return a.name?.localeCompare?.(b.name || "") || 0;
        return ap - bp;
      });
    return send(200, { providers });
  } catch (error) {
    console.error("providers_api: list failed", error);
    return send(500, { error: "Failed to load providers" });
  }
}

async function fetchProvider(id) {
  const providerId = sanitizeId(id);
  if (!providerId) {
    return send(404, { error: "Provider not found" });
  }
  try {
    const result = await getItem({
      TableName: TABLE_NAME,
      Key: {
        pk: providerPk(providerId),
        sk: "v0"
      }
    });
    if (!result.Item) {
      return send(404, { error: "Provider not found" });
    }
    return send(200, formatProvider(result.Item));
  } catch (error) {
    console.error("providers_api: get failed", error);
    return send(500, { error: "Failed to load provider" });
  }
}

async function createProvider(event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const firstName = optionalString(payload?.first_name || payload?.firstName);
  const lastName = optionalString(payload?.last_name || payload?.lastName);
  const providedName = optionalString(payload?.name);
  const name = providedName || [firstName, lastName].filter(Boolean).join(" ");
  if (!name) {
    return send(400, { error: "name is required" });
  }

  const requestedId = optionalString(payload?.id || payload?.provider_id || payload?.providerId) || name;
  let baseId = sanitizeId(requestedId);
  if (!baseId && name) {
    baseId = sanitizeId(name);
  }
  if (!baseId) {
    baseId = `provider-${Date.now()}`;
  }
  const id = await ensureUniqueProviderId(baseId);

  const now = new Date().toISOString();
  const item = {
    pk: providerPk(id),
    sk: "v0",
    id,
    name,
    provider_id: id,
    first_name: firstName,
    last_name: lastName,
    priority: toNumber(payload?.priority),
    email: optionalString(payload?.email),
    phone: optionalString(payload?.phone),
    services: toStringArray(payload?.services),
    availability: sanitizeAvailability(payload?.availability),
    bio: optionalString(payload?.bio),
    photoUrl: optionalString(payload?.photoUrl),
    createdAt: now,
    updatedAt: now
  };

  try {
    await putItem({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)"
    });
    return send(201, formatProvider(item));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return send(409, { error: "Provider already exists" });
    }
    console.error("providers_api: create failed", error);
    return send(500, { error: "Failed to create provider" });
  }
}

async function updateProvider(id, event) {
  const providerId = sanitizeId(id);
  if (!providerId) {
    return send(404, { error: "Provider not found" });
  }
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) {
      if (key === "priority") {
        const value = toNumber(payload[key]);
        if (value !== undefined) updates[key] = value;
      } else if (key === "services") {
        const value = toStringArray(payload[key]);
        if (value !== undefined) updates[key] = value;
      } else if (key === "availability") {
        const value = sanitizeAvailability(payload[key]);
        if (value !== undefined) updates[key] = value;
      } else {
        const value = optionalString(payload[key]);
        if (value !== undefined) updates[key] = value;
      }
    }
  }

  if (!Object.keys(updates).length) {
    return send(400, { error: "No updatable fields supplied" });
  }

  const now = new Date().toISOString();
  updates.updatedAt = now;

  const expressionParts = [];
  const expressionNames = {};
  const expressionValues = {};
  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const nameKey = `#f${index}`;
    const valueKey = `:v${index}`;
    expressionNames[nameKey] = key;
    expressionValues[valueKey] = value;
    expressionParts.push(`${nameKey} = ${valueKey}`);
    index += 1;
  }

  try {
    const result = await updateItem({
      TableName: TABLE_NAME,
      Key: { pk: providerPk(providerId), sk: "v0" },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: "attribute_exists(pk)",
      ReturnValues: "ALL_NEW"
    });
    return send(200, formatProvider(result.Attributes));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return send(404, { error: "Provider not found" });
    }
    console.error("providers_api: update failed", error);
    return send(500, { error: "Failed to update provider" });
  }
}

async function removeProvider(id) {
  const providerId = sanitizeId(id);
  if (!providerId) {
    return send(404, { error: "Provider not found" });
  }
  try {
    await deleteItem({
      TableName: TABLE_NAME,
      Key: { pk: providerPk(providerId), sk: "v0" },
      ConditionExpression: "attribute_exists(pk)"
    });
    return send(204, {});
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return send(404, { error: "Provider not found" });
    }
    console.error("providers_api: delete failed", error);
    return send(500, { error: "Failed to delete provider" });
  }
}

function formatProvider(item = {}) {
  const provider = { ...item };
  delete provider.pk;
  delete provider.sk;
  if (!provider.provider_id && provider.id) {
    provider.provider_id = provider.id;
  }
  if (!provider.name && provider.provider_name) {
    provider.name = provider.provider_name;
  }
  if (!provider.provider_name && provider.name) {
    provider.provider_name = provider.name;
  }
  if (!provider.first_name && provider.firstName) {
    provider.first_name = provider.firstName;
  }
  if (!provider.last_name && provider.lastName) {
    provider.last_name = provider.lastName;
  }
  return provider;
}

function providerPk(id) {
  return `PROVIDER#${id}`;
}

async function ensureUniqueProviderId(baseId) {
  let candidate = baseId;
  let counter = 1;
  while (await providerExists(candidate)) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }
  return candidate;
}

async function providerExists(id) {
  const result = await getItem({
    TableName: TABLE_NAME,
    Key: { pk: providerPk(id), sk: "v0" }
  });
  return Boolean(result.Item);
}

function sanitizeId(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-");
}

function optionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function sanitizeAvailability(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((slot) => {
      if (!slot || typeof slot !== "object") return undefined;
      const day = slot.day ?? slot.weekday ?? slot.dayOfWeek;
      const start = slot.start ?? slot.start_time ?? slot.startTime;
      const end = slot.end ?? slot.end_time ?? slot.endTime;
      const providerId = slot.provider_id ?? slot.providerId;
      return {
        day,
        start,
        end,
        provider_id: providerId,
        notes: slot.notes
      };
    })
    .filter((slot) => slot && slot.day !== undefined);
}

function normalizePath(rawPath, knownRoots = []) {
  if (!rawPath) return { path: "/", segments: [] };
  const roots = new Set(knownRoots);
  const segments = rawPath.split("/").filter(Boolean);
  if (segments.length > 0 && !roots.has(segments[0]) && segments.length > 1) {
    segments.shift();
  }
  const normalised = segments.length ? `/${segments.join("/")}` : "/";
  return { path: normalised, segments };
}
