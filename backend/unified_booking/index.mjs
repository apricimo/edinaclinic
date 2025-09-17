import http from "../lib/http.js";
import table from "../lib/tableStore.mjs";

const { parseJsonBody, send: sendResponse } = http;

const KNOWN_ROOTS = new Set([
  "ping",
  "services",
  "providers",
  "availability",
  "appointments",
  "stats"
]);

const STATUS_VALUES = new Set(["scheduled", "canceled", "completed", "refunded"]);
const DEFAULT_TIMEZONE = "America/Chicago";
const SUCCESS_HEADERS = { ok: true };

export async function handler(event = {}) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const rawPath = event?.rawPath || event?.path || "/";

  if (method === "OPTIONS") {
    return send(200, SUCCESS_HEADERS);
  }

  const { path, segments } = normalizePath(rawPath);
  const query = parseQuery(event);

  if (method === "GET" && path === "/ping") {
    return send(200, { ...SUCCESS_HEADERS, ts: new Date().toISOString() });
  }

  try {
    if (segments[0] === "services") {
      if (method === "GET" && segments.length === 1) {
        return send(200, { ...SUCCESS_HEADERS, data: await listServices(query) });
      }
      if (method === "POST" && segments.length === 1) {
        const payload = safeBody(event);
        const result = await createService(payload);
        if (!result.ok) return send(result.status, result.body);
        return send(201, { ...SUCCESS_HEADERS, data: result.data });
      }
      if (method === "PATCH" && segments.length === 2) {
        const payload = safeBody(event);
        const result = await updateService(segments[1], payload);
        if (!result.ok) return send(result.status, result.body);
        return send(200, { ...SUCCESS_HEADERS, data: result.data });
      }
    }

    if (segments[0] === "providers") {
      if (method === "GET" && segments.length === 1) {
        return send(200, { ...SUCCESS_HEADERS, data: await listProviders(query) });
      }
      if (method === "POST" && segments.length === 1) {
        const payload = safeBody(event);
        const result = await createProvider(payload);
        if (!result.ok) return send(result.status, result.body);
        return send(201, { ...SUCCESS_HEADERS, data: result.data });
      }
      if (method === "PATCH" && segments.length === 2) {
        const payload = safeBody(event);
        const result = await updateProvider(segments[1], payload);
        if (!result.ok) return send(result.status, result.body);
        return send(200, { ...SUCCESS_HEADERS, data: result.data });
      }
      if (method === "DELETE" && segments.length === 2) {
        const result = await deleteProvider(segments[1]);
        if (!result.ok) return send(result.status, result.body);
        return send(204, SUCCESS_HEADERS);
      }
    }

    if (segments[0] === "availability") {
      if (method === "GET" && segments.length === 1) {
        return send(200, { ...SUCCESS_HEADERS, data: await listAvailability(query) });
      }
      if (method === "POST" && segments.length === 1) {
        const payload = safeBody(event);
        const result = await createAvailability(payload);
        if (!result.ok) return send(result.status, result.body);
        return send(201, { ...SUCCESS_HEADERS, data: result.data });
      }
      if (method === "DELETE" && segments.length === 4) {
        const result = await deleteAvailability(segments[1], segments[2], segments[3]);
        if (!result.ok) return send(result.status, result.body);
        return send(204, SUCCESS_HEADERS);
      }
    }

    if (segments[0] === "appointments") {
      if (method === "GET" && segments.length === 1) {
        return send(200, { ...SUCCESS_HEADERS, data: await listAppointments(query) });
      }
      if (method === "POST" && segments.length === 1) {
        const payload = safeBody(event);
        const result = await createAppointment(payload);
        if (!result.ok) return send(result.status, result.body);
        return send(201, { ...SUCCESS_HEADERS, data: result.data });
      }
      if (method === "PATCH" && segments.length === 2) {
        const payload = safeBody(event);
        const result = await updateAppointment(segments[1], payload);
        if (!result.ok) return send(result.status, result.body);
        return send(200, { ...SUCCESS_HEADERS, data: result.data });
      }
    }

    if (segments[0] === "stats" && segments[1] === "sales" && method === "GET") {
      return send(200, { ...SUCCESS_HEADERS, data: await getSalesStats(query) });
    }
  } catch (error) {
    console.error("unified handler error", error);
    return send(500, { ok: false, error: "Internal error" });
  }

  return send(404, { ok: false, error: "Not found" });
}

function safeBody(event) {
  try {
    return parseJsonBody(event);
  } catch (error) {
    return {};
  }
}

function send(status, body) {
  return sendResponse(status, body);
}

function normalizePath(rawPath = "/") {
  const pieces = rawPath.split("/").filter(Boolean);
  if (pieces.length > 1 && !KNOWN_ROOTS.has(pieces[0].toLowerCase())) {
    pieces.shift();
  }
  const segments = pieces.map((piece, index) => {
    const decoded = decodeURIComponent(piece);
    return index === 0 ? decoded.toLowerCase() : decoded;
  });
  const path = `/${segments.join("/")}`.replace(/\/+/g, "/") || "/";
  return { path, segments };
}

function parseQuery(event = {}) {
  if (event.queryStringParameters) {
    return Object.fromEntries(
      Object.entries(event.queryStringParameters).map(([key, value]) => [key, value ?? ""])
    );
  }
  if (typeof event.rawQueryString === "string" && event.rawQueryString.length) {
    return Object.fromEntries(new URLSearchParams(event.rawQueryString));
  }
  return {};
}

async function listServices(query) {
  const items = (await table.queryByPrefix("SERVICE#"))
    .filter((item) => item.sk === "v0")
    .map(formatService)
    .filter((service) => (query.active === "false" ? true : service.active));
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

async function createService(payload) {
  const fields = {};
  const name = requiredString(payload?.name, "name", fields);
  const priceCents = toInteger(payload?.price_cents ?? payload?.priceCents, "price_cents", fields);
  const duration = toInteger(payload?.duration_min ?? payload?.durationMin, "duration_min", fields);
  const active = payload?.active !== undefined ? Boolean(payload.active) : true;
  const stateCodes = toStateArray(payload?.state_codes ?? payload?.states, "state_codes", fields);

  if (!name) fields.name = fields.name || "Name is required";
  if (priceCents === undefined) fields.price_cents = fields.price_cents || "Price in cents required";
  if (duration === undefined) fields.duration_min = fields.duration_min || "Duration in minutes required";
  if (!stateCodes.length) fields.state_codes = "At least one state must be selected";

  if (Object.keys(fields).length) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Validation failed", fields }
    };
  }

  const now = isoNow();
  const serviceId = generateId("svc");
  const pk = `SERVICE#${serviceId}`;
  const existing = await table.getItem(pk, "v0");
  if (existing) {
    return { ok: false, status: 409, body: { ok: false, error: "Service already exists" } };
  }

  const item = {
    pk,
    sk: "v0",
    service_id: serviceId,
    name,
    price_cents: priceCents,
    duration_min: duration,
    active,
    state_codes: stateCodes,
    created_at: now,
    updated_at: now
  };

  await table.updateItems(async (items) => {
    items.push(item);
    return { items, result: null };
  });

  return { ok: true, data: formatService(item) };
}

async function updateService(serviceId, payload) {
  const fields = {};
  const cleanId = optionalString(serviceId);
  if (!cleanId) {
    return { ok: false, status: 404, body: { ok: false, error: "Service not found" } };
  }
  const pk = `SERVICE#${cleanId}`;
  const existing = await table.getItem(pk, "v0");
  if (!existing) {
    return { ok: false, status: 404, body: { ok: false, error: "Service not found" } };
  }

  const updates = {};
  if (payload?.name !== undefined) {
    const name = requiredString(payload.name, "name", fields);
    if (name) updates.name = name;
  }
  if (payload?.price_cents !== undefined || payload?.priceCents !== undefined) {
    const price = toInteger(payload.price_cents ?? payload.priceCents, "price_cents", fields);
    if (price !== undefined) updates.price_cents = price;
  }
  if (payload?.duration_min !== undefined || payload?.durationMin !== undefined) {
    const duration = toInteger(payload.duration_min ?? payload.durationMin, "duration_min", fields);
    if (duration !== undefined) updates.duration_min = duration;
  }
  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }
  if (payload?.state_codes !== undefined || payload?.states !== undefined) {
    const states = toStateArray(payload.state_codes ?? payload.states, "state_codes", fields);
    if (states.length) {
      updates.state_codes = states;
    } else {
      fields.state_codes = fields.state_codes || "At least one state must be selected";
    }
  }

  if (Object.keys(fields).length) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Validation failed", fields }
    };
  }

  if (!Object.keys(updates).length) {
    return { ok: false, status: 400, body: { ok: false, error: "No updates supplied" } };
  }

  updates.updated_at = isoNow();
  const merged = { ...existing, ...updates };
  await table.updateItems(async (items) => {
    const nextItems = items.map((item) => (item.pk === pk && item.sk === "v0" ? merged : item));
    return { items: nextItems, result: null };
  });

  return { ok: true, data: formatService(merged) };
}

async function listProviders(query) {
  const providers = (await table.queryByPrefix("PROVIDER#"))
    .filter((item) => item.sk === "v0")
    .map(formatProvider)
    .filter((provider) => (query.include_inactive === "true" ? true : provider.active))
    .sort((a, b) => {
      const ap = Number.isFinite(a.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
      const bp = Number.isFinite(b.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
      if (ap === bp) return a.full_name.localeCompare(b.full_name);
      return ap - bp;
    });
  return providers;
}

async function createProvider(payload) {
  const fields = {};
  const fullName = requiredString(payload?.full_name ?? payload?.fullName, "full_name", fields);
  const email = requiredString(payload?.email, "email", fields);
  const phone = requiredString(payload?.phone, "phone", fields);
  const priority = toInteger(payload?.priority, "priority", fields);
  const offeredServiceIds = toStringArray(payload?.offered_service_ids ?? payload?.offeredServiceIds);
  const stateCodes = toStateArray(payload?.state_codes ?? payload?.states, "state_codes", fields);

  if (!offeredServiceIds.length) {
    fields.offered_service_ids = "At least one service must be selected";
  }
  if (!stateCodes.length) {
    fields.state_codes = "At least one state must be selected";
  }

  const active = payload?.active !== undefined ? Boolean(payload.active) : true;

  if (Object.keys(fields).length) {
    return { ok: false, status: 400, body: { ok: false, error: "Validation failed", fields } };
  }

  const services = await loadServiceMap();
  const unknown = offeredServiceIds.filter((id) => !services.has(id));
  if (unknown.length) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Validation failed", fields: { offered_service_ids: "Unknown service ids" } }
    };
  }

  const now = isoNow();
  const providerId = generateId("prv");
  const item = {
    pk: `PROVIDER#${providerId}`,
    sk: "v0",
    provider_id: providerId,
    full_name: fullName,
    email,
    phone,
    priority: priority ?? null,
    active,
    offered_service_ids: offeredServiceIds,
    state_codes: stateCodes,
    created_at: now,
    updated_at: now
  };

  await table.updateItems(async (items) => {
    items.push(item);
    return { items, result: null };
  });

  return { ok: true, data: formatProvider(item) };
}

async function updateProvider(providerId, payload) {
  const cleanId = optionalString(providerId);
  if (!cleanId) {
    return { ok: false, status: 404, body: { ok: false, error: "Provider not found" } };
  }
  const pk = `PROVIDER#${cleanId}`;
  const existing = await table.getItem(pk, "v0");
  if (!existing) {
    return { ok: false, status: 404, body: { ok: false, error: "Provider not found" } };
  }

  const fields = {};
  const updates = {};
  if (payload?.full_name !== undefined || payload?.fullName !== undefined) {
    const name = requiredString(payload.full_name ?? payload.fullName, "full_name", fields);
    if (name) updates.full_name = name;
  }
  if (payload?.email !== undefined) {
    const email = requiredString(payload.email, "email", fields);
    if (email) updates.email = email;
  }
  if (payload?.phone !== undefined) {
    const phone = requiredString(payload.phone, "phone", fields);
    if (phone) updates.phone = phone;
  }
  if (payload?.priority !== undefined) {
    const priority = toInteger(payload.priority, "priority", fields);
    if (priority !== undefined) updates.priority = priority;
  }
  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }
  if (payload?.offered_service_ids !== undefined || payload?.offeredServiceIds !== undefined) {
    const offered = toStringArray(payload.offered_service_ids ?? payload.offeredServiceIds);
    if (offered.length) {
      const services = await loadServiceMap();
      const unknown = offered.filter((id) => !services.has(id));
      if (unknown.length) {
        fields.offered_service_ids = "Unknown service ids";
      } else {
        updates.offered_service_ids = offered;
      }
    } else {
      fields.offered_service_ids = "At least one service must be selected";
    }
  }
  if (payload?.state_codes !== undefined || payload?.states !== undefined) {
    const states = toStateArray(payload.state_codes ?? payload.states, "state_codes", fields);
    if (states.length) {
      updates.state_codes = states;
    } else {
      fields.state_codes = "At least one state must be selected";
    }
  }

  if (Object.keys(fields).length) {
    return { ok: false, status: 400, body: { ok: false, error: "Validation failed", fields } };
  }

  if (!Object.keys(updates).length) {
    return { ok: false, status: 400, body: { ok: false, error: "No updates supplied" } };
  }

  updates.updated_at = isoNow();
  const merged = { ...existing, ...updates };

  await table.updateItems(async (items) => {
    const nextItems = items.map((item) => (item.pk === pk && item.sk === "v0" ? merged : item));
    return { items: nextItems, result: null };
  });

  return { ok: true, data: formatProvider(merged) };
}

async function deleteProvider(providerId) {
  const cleanId = optionalString(providerId);
  if (!cleanId) {
    return { ok: false, status: 404, body: { ok: false, error: "Provider not found" } };
  }
  const pk = `PROVIDER#${cleanId}`;
  const existing = await table.getItem(pk, "v0");
  if (!existing) {
    return { ok: false, status: 404, body: { ok: false, error: "Provider not found" } };
  }

  const appointments = await table.queryByPrefix("APPT#");
  const hasActive = appointments.some(
    (item) =>
      item.provider_id === cleanId &&
      item.status !== "canceled" &&
      item.status !== "refunded"
  );
  if (hasActive) {
    return {
      ok: false,
      status: 409,
      body: { ok: false, error: "Provider has scheduled appointments" }
    };
  }

  await table.updateItems(async (items) => {
    const nextItems = items.filter((item) => {
      if (item.pk === pk && item.sk === "v0") return false;
      if (item.pk.startsWith(`AVAIL#${cleanId}#`)) return false;
      return true;
    });
    return { items: nextItems, result: null };
  });

  return { ok: true };
}

async function listAvailability(query) {
  const serviceId = optionalString(query.service_id ?? query.serviceId);
  const providerId = optionalString(query.provider_id ?? query.providerId);
  const stateFilter = optionalString(query.state ?? query.state_code ?? query.stateCode)?.toUpperCase();
  const start = optionalString(query.start) || optionalString(query.start_time) || optionalString(query.from);
  const end = optionalString(query.end) || optionalString(query.end_time) || optionalString(query.to);

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  const availabilities = (await table.queryByPrefix("AVAIL#"))
    .filter((item) => {
      if (serviceId && item.service_id !== serviceId) return false;
      if (providerId && item.provider_id !== providerId) return false;
      if (stateFilter && item.state_code !== stateFilter) return false;
      if (startDate && new Date(item.start_time) < startDate) return false;
      if (endDate && new Date(item.start_time) > endDate) return false;
      const bookedCount = Array.isArray(item.booked_appointment_ids) ? item.booked_appointment_ids.length : 0;
      return bookedCount < (item.capacity ?? 1);
    })
    .map(formatAvailability)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return availabilities;
}

async function createAvailability(payload) {
  const fields = {};
  const providerId = requiredString(payload?.provider_id ?? payload?.providerId, "provider_id", fields);
  const serviceId = requiredString(payload?.service_id ?? payload?.serviceId, "service_id", fields);
  const start = requiredString(payload?.start_time ?? payload?.startTime, "start_time", fields);
  const end = requiredString(payload?.end_time ?? payload?.endTime, "end_time", fields);
  const stateCode = requiredString(payload?.state_code ?? payload?.state ?? payload?.stateCode, "state_code", fields)?.toUpperCase();
  const capacity = toInteger(payload?.capacity, "capacity", fields) ?? 1;

  if (capacity <= 0) {
    fields.capacity = "Capacity must be at least 1";
  }

  if (Object.keys(fields).length) {
    return { ok: false, status: 400, body: { ok: false, error: "Validation failed", fields } };
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return invalidField("start_time", "Invalid start time");
  }
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return invalidField("end_time", "Invalid end time");
  }
  if (endDate <= startDate) {
    return invalidField("end_time", "End time must be after start time");
  }

  const providers = await loadProviderMap();
  const provider = providers.get(providerId);
  if (!provider) {
    return invalidField("provider_id", "Provider not found");
  }
  if (!provider.active) {
    return invalidField("provider_id", "Provider is inactive");
  }
  if (!provider.offered_service_ids.includes(serviceId)) {
    return invalidField("service_id", "Provider does not offer this service");
  }
  if (!provider.state_codes.includes(stateCode)) {
    return invalidField("state_code", "Provider is not enabled for this state");
  }

  const services = await loadServiceMap();
  const service = services.get(serviceId);
  if (!service) {
    return invalidField("service_id", "Service not found");
  }
  if (!service.state_codes.includes(stateCode)) {
    return invalidField("state_code", "Service unavailable in this state");
  }

  const pk = `AVAIL#${providerId}#${startDate.toISOString()}`;
  const sk = `SERVICE#${serviceId}`;
  const now = isoNow();
  const item = {
    pk,
    sk,
    provider_id: providerId,
    service_id: serviceId,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    capacity,
    state_code: stateCode,
    booked_appointment_ids: [],
    created_at: now,
    updated_at: now
  };

  const existing = await table.getItem(pk, sk);
  if (existing) {
    return { ok: false, status: 409, body: { ok: false, error: "Availability already exists" } };
  }

  await table.updateItems(async (items) => {
    items.push(item);
    return { items, result: null };
  });

  return { ok: true, data: formatAvailability(item) };
}

async function deleteAvailability(providerId, startIso, serviceId) {
  const cleanProvider = optionalString(providerId);
  const cleanService = optionalString(serviceId);
  const startTime = optionalString(startIso);
  if (!cleanProvider || !cleanService || !startTime) {
    return { ok: false, status: 400, body: { ok: false, error: "Invalid availability identifier" } };
  }
  const pk = `AVAIL#${cleanProvider}#${startTime}`;
  const sk = `SERVICE#${cleanService}`;
  const existing = await table.getItem(pk, sk);
  if (!existing) {
    return { ok: false, status: 404, body: { ok: false, error: "Availability not found" } };
  }
  if (Array.isArray(existing.booked_appointment_ids) && existing.booked_appointment_ids.length) {
    return { ok: false, status: 409, body: { ok: false, error: "Slot already booked" } };
  }
  await table.updateItems(async (items) => {
    const nextItems = items.filter((item) => !(item.pk === pk && item.sk === sk));
    return { items: nextItems, result: null };
  });
  return { ok: true };
}

async function listAppointments(query) {
  const filters = {
    service_id: optionalString(query.service_id ?? query.serviceId),
    provider_id: optionalString(query.provider_id ?? query.providerId),
    status: optionalString(query.status),
    state_code: optionalString(query.state ?? query.state_code ?? query.stateCode)?.toUpperCase(),
    start: optionalString(query.start) || optionalString(query.from),
    end: optionalString(query.end) || optionalString(query.to)
  };
  const startDate = filters.start ? new Date(filters.start) : null;
  const endDate = filters.end ? new Date(filters.end) : null;

  const services = await loadServiceMap();
  const providers = await loadProviderMap();

  const rows = (await table.queryByPrefix("APPT#"))
    .filter((item) => item.sk === "v0")
    .filter((item) => {
      if (filters.service_id && item.service_id !== filters.service_id) return false;
      if (filters.provider_id && item.provider_id !== filters.provider_id) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.state_code && item.state_code !== filters.state_code) return false;
      if (startDate && new Date(item.start_time) < startDate) return false;
      if (endDate && new Date(item.start_time) > endDate) return false;
      return true;
    })
    .map((item) => formatAppointment(item, services, providers))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return rows;
}

async function createAppointment(payload) {
  const fields = {};
  const serviceId = requiredString(payload?.service_id ?? payload?.serviceId, "service_id", fields);
  const providerId = requiredString(payload?.provider_id ?? payload?.providerId, "provider_id", fields);
  const start = requiredString(payload?.start_time ?? payload?.startTime, "start_time", fields);
  const patientName = requiredString(payload?.patient_name ?? payload?.patientName, "patient_name", fields);
  const patientEmail = requiredString(payload?.patient_email ?? payload?.patientEmail, "patient_email", fields);
  const patientPhone = requiredString(payload?.patient_phone ?? payload?.patientPhone, "patient_phone", fields);
  const stateCode = requiredString(payload?.state_code ?? payload?.state ?? payload?.stateCode, "state_code", fields)?.toUpperCase();

  if (Object.keys(fields).length) {
    return { ok: false, status: 400, body: { ok: false, error: "Validation failed", fields } };
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return invalidField("start_time", "Invalid start time");
  }

  const services = await loadServiceMap();
  const providers = await loadProviderMap();
  const service = services.get(serviceId);
  const provider = providers.get(providerId);

  if (!service || !service.active) {
    return invalidField("service_id", "Service unavailable");
  }
  if (!provider || !provider.active) {
    return invalidField("provider_id", "Provider unavailable");
  }
  if (!provider.offered_service_ids.includes(serviceId)) {
    return invalidField("provider_id", "Provider cannot perform this service");
  }
  if (!provider.state_codes.includes(stateCode)) {
    return invalidField("state_code", "Provider not available in that state");
  }
  if (!service.state_codes.includes(stateCode)) {
    return invalidField("state_code", "Service not enabled for that state");
  }

  const availabilityPk = `AVAIL#${providerId}#${startDate.toISOString()}`;
  const availabilitySk = `SERVICE#${serviceId}`;
  const availability = await table.getItem(availabilityPk, availabilitySk);
  if (!availability) {
    return invalidField("start_time", "Selected time is no longer available");
  }
  if (availability.state_code !== stateCode) {
    return invalidField("state_code", "Slot not available in that state");
  }
  const booked = Array.isArray(availability.booked_appointment_ids) ? availability.booked_appointment_ids : [];
  if (booked.length >= (availability.capacity ?? 1)) {
    return invalidField("start_time", "Selected time just booked. Please pick another.");
  }

  const appointmentId = generateId("apt");
  const endDate = new Date(startDate.getTime() + service.duration_min * 60000);
  const now = isoNow();
  const appointmentItem = {
    pk: `APPT#${appointmentId}`,
    sk: "v0",
    appointment_id: appointmentId,
    service_id: serviceId,
    provider_id: providerId,
    patient_name: patientName,
    patient_email: patientEmail,
    patient_phone: patientPhone,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    status: "scheduled",
    price_cents: service.price_cents,
    state_code: stateCode,
    created_at: now,
    updated_at: now
  };

  try {
    await table.updateItems(async (items) => {
      const nextItems = items.map((item) => {
        if (item.pk === availabilityPk && item.sk === availabilitySk) {
          const bookedIds = Array.isArray(item.booked_appointment_ids) ? item.booked_appointment_ids.slice() : [];
          if (bookedIds.length >= (item.capacity ?? 1)) {
            throw new Error("slot-full");
          }
          bookedIds.push(appointmentId);
          return {
            ...item,
            booked_appointment_ids: bookedIds,
            updated_at: isoNow()
          };
        }
        return item;
      });
      nextItems.push(appointmentItem);
      return { items: nextItems, result: null };
    });
  } catch (error) {
    if (error.message === "slot-full") {
      return invalidField("start_time", "Selected time just booked. Please pick another.");
    }
    throw error;
  }

  const formatted = formatAppointment(appointmentItem, services, providers);
  return { ok: true, data: formatted };
}

async function updateAppointment(appointmentId, payload) {
  const cleanId = optionalString(appointmentId);
  if (!cleanId) {
    return { ok: false, status: 404, body: { ok: false, error: "Appointment not found" } };
  }
  const pk = `APPT#${cleanId}`;
  const existing = await table.getItem(pk, "v0");
  if (!existing) {
    return { ok: false, status: 404, body: { ok: false, error: "Appointment not found" } };
  }

  const fields = {};
  const updates = {};
  if (payload?.status !== undefined) {
    const status = optionalString(payload.status);
    if (!status || !STATUS_VALUES.has(status)) {
      fields.status = "Invalid status";
    } else {
      updates.status = status;
    }
  }
  if (payload?.patient_name !== undefined || payload?.patientName !== undefined) {
    const name = requiredString(payload.patient_name ?? payload.patientName, "patient_name", fields);
    if (name) updates.patient_name = name;
  }
  if (payload?.patient_email !== undefined || payload?.patientEmail !== undefined) {
    const email = requiredString(payload.patient_email ?? payload.patientEmail, "patient_email", fields);
    if (email) updates.patient_email = email;
  }
  if (payload?.patient_phone !== undefined || payload?.patientPhone !== undefined) {
    const phone = requiredString(payload.patient_phone ?? payload.patientPhone, "patient_phone", fields);
    if (phone) updates.patient_phone = phone;
  }

  if (Object.keys(fields).length) {
    return { ok: false, status: 400, body: { ok: false, error: "Validation failed", fields } };
  }

  if (!Object.keys(updates).length) {
    return { ok: false, status: 400, body: { ok: false, error: "No updates supplied" } };
  }

  updates.updated_at = isoNow();
  const merged = { ...existing, ...updates };
  await table.updateItems(async (items) => {
    const nextItems = items.map((item) => (item.pk === pk && item.sk === "v0" ? merged : item));
    return { items: nextItems, result: null };
  });

  const services = await loadServiceMap();
  const providers = await loadProviderMap();
  return { ok: true, data: formatAppointment(merged, services, providers) };
}

async function getSalesStats(query) {
  const start = optionalString(query.start) || optionalString(query.from);
  const end = optionalString(query.end) || optionalString(query.to);
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  const appointments = (await table.queryByPrefix("APPT#"))
    .filter((item) => item.sk === "v0")
    .filter((item) => {
      if (startDate && new Date(item.start_time) < startDate) return false;
      if (endDate && new Date(item.start_time) > endDate) return false;
      return true;
    });

  const dailyMap = new Map();
  let gross = 0;
  let refunded = 0;
  let count = 0;

  for (const item of appointments) {
    const dateKey = toChicagoDate(item.start_time);
    const entry = dailyMap.get(dateKey) || { date: dateKey, gross_cents: 0, refunds_cents: 0, net_cents: 0, appointment_count: 0 };
    const price = Number(item.price_cents) || 0;
    if (item.status === "refunded") {
      entry.refunds_cents += price;
      refunded += price;
    } else if (item.status !== "canceled") {
      entry.gross_cents += price;
      entry.appointment_count += 1;
      gross += price;
      count += 1;
    }
    entry.net_cents = entry.gross_cents - entry.refunds_cents;
    dailyMap.set(dateKey, entry);
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  const net = gross - refunded;
  const average = count ? Math.round(net / count) : 0;

  return {
    daily,
    summary: {
      gross_cents: gross,
      refunds_cents: refunded,
      net_cents: net,
      paid_appointments: count,
      average_order_value_cents: average
    }
  };
}

function formatService(item) {
  return {
    service_id: item.service_id,
    name: item.name,
    price_cents: item.price_cents,
    duration_min: item.duration_min,
    active: Boolean(item.active),
    state_codes: item.state_codes || [],
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function formatProvider(item) {
  return {
    provider_id: item.provider_id,
    full_name: item.full_name,
    email: item.email,
    phone: item.phone,
    priority: item.priority,
    active: Boolean(item.active),
    offered_service_ids: item.offered_service_ids || [],
    state_codes: item.state_codes || [],
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function formatAvailability(item) {
  return {
    provider_id: item.provider_id,
    service_id: item.service_id,
    start_time: item.start_time,
    end_time: item.end_time,
    capacity: item.capacity ?? 1,
    state_code: item.state_code,
    remaining_capacity: Math.max((item.capacity ?? 1) - (item.booked_appointment_ids?.length || 0), 0)
  };
}

function formatAppointment(item, services, providers) {
  const service = services?.get?.(item.service_id);
  const provider = providers?.get?.(item.provider_id);
  return {
    appointment_id: item.appointment_id,
    service_id: item.service_id,
    provider_id: item.provider_id,
    patient_name: item.patient_name,
    patient_email: item.patient_email,
    patient_phone: item.patient_phone,
    start_time: item.start_time,
    end_time: item.end_time,
    status: item.status,
    price_cents: item.price_cents,
    state_code: item.state_code,
    created_at: item.created_at,
    updated_at: item.updated_at,
    service_name: service?.name,
    provider_name: provider?.full_name
  };
}

async function loadServiceMap() {
  const services = await listServices({ active: "false" });
  return new Map(services.map((service) => [service.service_id, service]));
}

async function loadProviderMap() {
  const providers = await listProviders({ include_inactive: "true" });
  return new Map(providers.map((provider) => [provider.provider_id, provider]));
}

function generateId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}${random}`;
}

function isoNow() {
  return new Date().toISOString();
}

function requiredString(value, field, fields) {
  if (value === undefined || value === null) {
    fields[field] = `${field.replace(/_/g, " ")} is required`;
    return undefined;
  }
  const str = String(value).trim();
  if (!str) {
    fields[field] = `${field.replace(/_/g, " ")} is required`;
    return undefined;
  }
  return str;
}

function optionalString(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str || undefined;
}

function toInteger(value, field, fields) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    if (field && fields) fields[field] = `${field.replace(/_/g, " ")} must be a number`;
    return undefined;
  }
  return Math.trunc(number);
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => optionalString(entry))
    .filter(Boolean);
}

function toStateArray(value, field, fields) {
  const arr = toStringArray(value).map((code) => code.toUpperCase());
  if (field && fields && value !== undefined && !arr.length) {
    fields[field] = `${field.replace(/_/g, " ")} must include at least one state`;
  }
  return arr;
}

function invalidField(field, message) {
  return { ok: false, status: 400, body: { ok: false, error: message, fields: { [field]: message } } };
}

function toChicagoDate(isoString) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(new Date(isoString));
}
