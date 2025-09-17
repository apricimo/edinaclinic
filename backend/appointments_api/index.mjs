import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import http from "../lib/http.js";

const { send, parseJsonBody } = http;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "../../data/appointments.json");
const SERVICE_PREF_PATH = path.resolve(__dirname, "../../data/service_preferences.json");
const SERVICES_PATH = path.resolve(__dirname, "../../data/services.json");

const STATUS_SEQUENCE = ["draft", "pending_payment", "paid", "completed", "no_show", "canceled"];
const PAYMENT_STATUSES = ["initiated", "succeeded", "failed", "refunded", "partially_refunded"];
const NOTIFICATION_STATUSES = ["queued", "sent", "failed"];

let cachedServices;

export async function handler(event = {}) {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const rawPath = event?.rawPath || event?.path || "/";
  const { path: normalizedPath, segments } = normalizePath(rawPath, ["appointments", "slots", "services"]);

  if (method === "OPTIONS") return send(200, { ok: true });
  if (method === "GET" && normalizedPath === "/ping") {
    return send(200, { ok: true, api: "appointments", ts: new Date().toISOString() });
  }

  try {
    if (segments[0] === "services" && segments[1] === "preferences") {
      if (method === "GET") {
        return send(200, await loadServicePreferences());
      }
      if (method === "PUT" && segments[2]) {
        return await updateServicePreferences(segments[2], event);
      }
    }

    if (segments[0] === "slots" && method === "GET") {
      return await listSlots(event);
    }

    if (segments[0] === "appointments" && segments.length === 2 && segments[1] === "summary") {
      if (method === "GET") {
        return await getSummary(event);
      }
    }

    if (segments[0] === "appointments" && segments.length === 1) {
      if (method === "GET") {
        return await listAppointments(event);
      }
      if (method === "POST") {
        return await createAppointment(event);
      }
    }

    if (segments[0] === "appointments" && segments[1]) {
      const appointmentId = sanitizeId(segments[1]);
      if (!appointmentId) return send(404, { error: "Appointment not found" });

      if (segments.length === 2) {
        if (method === "GET") {
          return await fetchAppointment(appointmentId);
        }
        if (method === "PUT") {
          return await updateAppointment(appointmentId, event);
        }
        if (method === "DELETE") {
          return await deleteAppointment(appointmentId);
        }
      }

      if (segments[2] === "cancel" && method === "POST") {
        return await cancelAppointment(appointmentId, event);
      }
      if (segments[2] === "reschedule" && method === "POST") {
        return await rescheduleAppointment(appointmentId, event);
      }
      if (segments[2] === "refund" && method === "POST") {
        return await issueRefund(appointmentId, event);
      }
      if (segments[2] === "notifications") {
        if (segments.length === 3 && method === "POST") {
          return await recordNotification(appointmentId, event);
        }
        if (segments[3] === "resend" && method === "POST") {
          return await resendNotification(appointmentId, event);
        }
      }
    }
  } catch (error) {
    console.error("appointments_api: unexpected error", error);
    return send(500, { error: "Internal error" });
  }

  return send(404, { error: "Not found" });
}

async function listAppointments(event) {
  const params = event?.queryStringParameters || {};
  const db = await loadDatabase();
  const appointments = db.appointments || [];

  const filtered = applyFilters(appointments, params);
  const summary = computeSummary(filtered, params);

  return send(200, {
    appointments: filtered.map((appt) => normalizeAppointment(appt)),
    summary
  });
}

async function listSlots(event) {
  const params = event?.queryStringParameters || {};
  const serviceId = sanitizeString(params.service_id || params.serviceId);
  const dateStr = sanitizeString(params.date);
  if (!serviceId || !dateStr) {
    return send(400, { error: "service_id and date are required" });
  }

  const targetDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) {
    return send(400, { error: "Invalid date" });
  }

  const providers = await loadProviders();
  const db = await loadDatabase();
  const appointments = db.appointments || [];

  const slots = computeSlotsForDate({
    providers,
    appointments,
    service: await getServiceById(serviceId),
    date: targetDate
  });

  return send(200, {
    date: dateStr,
    service_id: serviceId,
    slots
  });
}

async function fetchAppointment(id) {
  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }
  return send(200, normalizeAppointment(appointment));
}

async function createAppointment(event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  await loadServices();
  const validation = validateCreationPayload(payload);
  if (!validation.valid) {
    return send(400, { error: validation.error });
  }

  const db = await loadDatabase();
  const now = new Date().toISOString();
  const service = await getServiceById(validation.service_id);

  const id = payload?.id ? sanitizeId(payload.id) : `apt_${randomUUID()}`;
  const providerConflicts = findConflicts({
    appointments: db.appointments,
    providerId: validation.provider_id,
    startIso: validation.start_time,
    endIso: validation.end_time,
    ignoreId: null,
    bufferBefore: service?.buffer_before_min || 0,
    bufferAfter: service?.buffer_after_min || 0
  });
  if (providerConflicts.length) {
    return send(409, {
      error: "Time slot no longer available",
      conflicts: providerConflicts.map((appt) => ({ id: appt.id, start_time: appt.start_time, end_time: appt.end_time }))
    });
  }

  const prefs = await loadServicePreferences();
  const reminderPrefs = prefs[validation.service_id] || {};

  const zoom = generateZoomDetails(id);
  const paymentAmount = derivePaymentAmount(payload, service);
  const reminderSettings = buildReminderSettings(validation.start_time, reminderPrefs);

  const appointment = {
    id,
    status: "paid",
    payment_status: "succeeded",
    service_id: validation.service_id,
    service_name: validation.service_name || service?.name,
    provider_id: validation.provider_id,
    provider_name: validation.provider_name,
    start_time: validation.start_time,
    end_time: validation.end_time,
    timezone: validation.timezone || "America/Chicago",
    patient_name: validation.patient_name,
    patient_email: validation.patient_email,
    patient_mobile: validation.patient_mobile,
    text_consent: validation.text_consent,
    cancellation_policy: service?.cancellation_policy || "",
    zoom_join_url: zoom.join,
    zoom_host_url: zoom.host,
    zoom_meeting_id: zoom.meetingId,
    payment_amount_cents: paymentAmount.amount,
    payment_currency: paymentAmount.currency,
    payment_reference: payload?.payment_reference || null,
    refund_amount_cents: 0,
    refund_id: null,
    refunds: [],
    reminder_settings: reminderSettings,
    notification_history: [],
    audit_trail: [],
    payment_events: [
      {
        id: randomUUID(),
        type: "payment_succeeded",
        amount_cents: paymentAmount.amount,
        currency: paymentAmount.currency,
        created_at: now,
        actor: validation.requested_by
      }
    ],
    notification_preferences: {
      patient_channels: ["email", "text"],
      provider_channels: ["email", "text"]
    },
    created_at: now,
    updated_at: now,
    created_by: validation.requested_by,
    updated_by: validation.requested_by
  };

  addAuditEntry(appointment, {
    actor: validation.requested_by,
    action: "appointment_created",
    details: {
      service_id: appointment.service_id,
      provider_id: appointment.provider_id,
      start_time: appointment.start_time
    }
  });

  seedConfirmationNotifications(appointment);

  db.appointments.push(appointment);
  await saveDatabase(db);

  return send(201, normalizeAppointment(appointment));
}

async function updateAppointment(id, event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  const updates = buildAppointmentUpdates(appointment, payload);
  if (updates.error) {
    return send(400, { error: updates.error });
  }
  if (!updates.hasUpdates) {
    return send(400, { error: "No updatable fields supplied" });
  }

  Object.assign(appointment, updates.fields);
  appointment.updated_at = new Date().toISOString();
  appointment.updated_by = updates.actor;

  if (updates.auditDetails) {
    addAuditEntry(appointment, updates.auditDetails);
  }

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function deleteAppointment(id) {
  const db = await loadDatabase();
  const before = db.appointments.length;
  db.appointments = db.appointments.filter((item) => item.id !== id);
  if (db.appointments.length === before) {
    return send(404, { error: "Appointment not found" });
  }
  await saveDatabase(db);
  return send(204, {});
}

async function cancelAppointment(id, event) {
  let payload = {};
  try {
    if (event?.body) payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const actor = sanitizeString(payload.actor) || "admin";
  const reason = sanitizeString(payload.reason) || "Canceled by clinic";

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  if (appointment.status === "canceled") {
    return send(409, { error: "Appointment already canceled" });
  }

  appointment.status = "canceled";
  appointment.cancellation_reason = reason;
  appointment.canceled_by = actor;
  appointment.canceled_at = new Date().toISOString();
  appointment.updated_at = appointment.canceled_at;
  appointment.updated_by = actor;

  disableReminders(appointment);

  addAuditEntry(appointment, {
    actor,
    action: "appointment_canceled",
    details: { reason }
  });

  addNotification(appointment, {
    type: "cancellation",
    channel: "email",
    recipient: "patient",
    message: `Cancellation sent to ${appointment.patient_email}`,
    triggered_by: actor,
    idempotency_key: `cancel:${appointment.id}:patient:email`
  });
  addNotification(appointment, {
    type: "cancellation",
    channel: "text",
    recipient: "patient",
    message: `Cancellation text sent to ${appointment.patient_mobile}`,
    triggered_by: actor,
    idempotency_key: `cancel:${appointment.id}:patient:text`
  });
  addNotification(appointment, {
    type: "cancellation",
    channel: "email",
    recipient: "provider",
    message: `Cancellation sent to provider ${appointment.provider_name}`,
    triggered_by: actor,
    idempotency_key: `cancel:${appointment.id}:provider:email`
  });
  addNotification(appointment, {
    type: "cancellation",
    channel: "text",
    recipient: "provider",
    message: `Cancellation text sent to provider ${appointment.provider_name}`,
    triggered_by: actor,
    idempotency_key: `cancel:${appointment.id}:provider:text`
  });

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function rescheduleAppointment(id, event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const actor = sanitizeString(payload.actor) || "admin";
  const newStart = normalizeIso(payload.new_start || payload.start_time || payload.start);
  const newEnd = normalizeIso(payload.new_end || payload.end_time || payload.end);
  if (!newStart) return send(400, { error: "new_start is required" });

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  const service = await getServiceById(appointment.service_id);
  const endTime = newEnd || addMinutesToIso(newStart, service?.duration_min || 30);

  const conflicts = findConflicts({
    appointments: db.appointments,
    providerId: appointment.provider_id,
    startIso: newStart,
    endIso: endTime,
    ignoreId: appointment.id,
    bufferBefore: service?.buffer_before_min || 0,
    bufferAfter: service?.buffer_after_min || 0
  });
  if (conflicts.length) {
    return send(409, {
      error: "Time slot no longer available",
      conflicts: conflicts.map((appt) => ({ id: appt.id, start_time: appt.start_time, end_time: appt.end_time }))
    });
  }

  const previousStart = appointment.start_time;
  appointment.start_time = newStart;
  appointment.end_time = endTime;
  appointment.rescheduled_from = previousStart;
  appointment.updated_at = new Date().toISOString();
  appointment.updated_by = actor;
  appointment.status = "paid";

  appointment.reminder_settings = buildReminderSettings(newStart, appointment.reminder_settings || {});

  addAuditEntry(appointment, {
    actor,
    action: "appointment_rescheduled",
    details: { from: previousStart, to: newStart }
  });

  addNotification(appointment, {
    type: "reschedule",
    channel: "email",
    recipient: "patient",
    message: `Reschedule confirmation sent to ${appointment.patient_email}`,
    triggered_by: actor,
    idempotency_key: `reschedule:${appointment.id}:patient:email:${newStart}`
  });
  addNotification(appointment, {
    type: "reschedule",
    channel: "text",
    recipient: "patient",
    message: `Reschedule text sent to ${appointment.patient_mobile}`,
    triggered_by: actor,
    idempotency_key: `reschedule:${appointment.id}:patient:text:${newStart}`
  });
  addNotification(appointment, {
    type: "reschedule",
    channel: "email",
    recipient: "provider",
    message: `Reschedule confirmation sent to provider ${appointment.provider_name}`,
    triggered_by: actor,
    idempotency_key: `reschedule:${appointment.id}:provider:email:${newStart}`
  });
  addNotification(appointment, {
    type: "reschedule",
    channel: "text",
    recipient: "provider",
    message: `Reschedule text sent to provider ${appointment.provider_name}`,
    triggered_by: actor,
    idempotency_key: `reschedule:${appointment.id}:provider:text:${newStart}`
  });

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function issueRefund(id, event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const amountCents = normalizeCurrency(payload.amount_cents ?? payload.amount);
  const reason = sanitizeString(payload.reason) || "Refund issued";
  const actor = sanitizeString(payload.actor) || "admin";
  const refundId = sanitizeString(payload.refund_id) || `refund_${randomUUID()}`;
  if (!amountCents || amountCents < 0) {
    return send(400, { error: "Refund amount must be positive" });
  }

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  const totalPaid = appointment.payment_amount_cents || 0;
  const priorRefund = appointment.refunded_total_cents || 0;
  if (amountCents + priorRefund > totalPaid) {
    return send(400, { error: "Refund exceeds amount paid" });
  }

  const now = new Date().toISOString();
  const refundEntry = {
    id: refundId,
    amount_cents: amountCents,
    reason,
    actor,
    created_at: now
  };
  appointment.refunds = Array.isArray(appointment.refunds) ? appointment.refunds : [];
  appointment.refunds.push(refundEntry);
  appointment.refund_amount_cents = amountCents;
  appointment.refund_id = refundId;
  appointment.refund_reason = reason;
  appointment.refunded_total_cents = priorRefund + amountCents;
  appointment.updated_at = now;
  appointment.updated_by = actor;

  if (appointment.refunded_total_cents >= totalPaid) {
    appointment.payment_status = "refunded";
  } else {
    appointment.payment_status = "partially_refunded";
  }

  appointment.payment_events = Array.isArray(appointment.payment_events) ? appointment.payment_events : [];
  appointment.payment_events.push({
    id: randomUUID(),
    type: "refund_issued",
    amount_cents: amountCents,
    currency: appointment.payment_currency,
    created_at: now,
    actor,
    reference_id: refundId
  });

  addAuditEntry(appointment, {
    actor,
    action: "refund_issued",
    details: { amount_cents: amountCents, refund_id: refundId }
  });

  addNotification(appointment, {
    type: "refund",
    channel: "email",
    recipient: "patient",
    message: `Refund confirmation sent to ${appointment.patient_email}`,
    triggered_by: actor,
    idempotency_key: `refund:${appointment.id}:${refundId}:patient:email`
  });
  addNotification(appointment, {
    type: "refund",
    channel: "text",
    recipient: "patient",
    message: `Refund confirmation text sent to ${appointment.patient_mobile}`,
    triggered_by: actor,
    idempotency_key: `refund:${appointment.id}:${refundId}:patient:text`
  });

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function recordNotification(id, event) {
  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  const actor = sanitizeString(payload.actor) || "admin";
  const type = sanitizeString(payload.type) || "manual";
  const status = sanitizeString(payload.status) || "sent";
  if (!NOTIFICATION_STATUSES.includes(status)) {
    return send(400, { error: "Invalid notification status" });
  }

  const channels = normalizeChannels(payload.channels || payload.channel);
  if (!channels.length) {
    return send(400, { error: "At least one channel required" });
  }

  const recipient = sanitizeString(payload.recipient) || "patient";
  const message = sanitizeString(payload.message) || buildNotificationMessage(type, recipient);
  const errorCode = sanitizeString(payload.error_code);
  const forced = Boolean(payload.force);
  const reference = sanitizeString(payload.reference) || undefined;

  channels.forEach((channel) => {
    addNotification(appointment, {
      type,
      channel,
      recipient,
      status,
      message,
      triggered_by: actor,
      error_code: errorCode,
      idempotency_key: reference ? `${type}:${reference}:${recipient}:${channel}` : undefined,
      force: forced
    });
  });

  appointment.updated_at = new Date().toISOString();
  appointment.updated_by = actor;

  addAuditEntry(appointment, {
    actor,
    action: "notification_recorded",
    details: { type, channels, recipient, status }
  });

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function resendNotification(id, event) {
  let payload = {};
  try {
    if (event?.body) payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const channels = normalizeChannels(payload.channels || ["email", "text"]);
  const type = sanitizeString(payload.type) || "confirmation";
  const recipient = sanitizeString(payload.recipient) || "patient";
  const actor = sanitizeString(payload.actor) || "admin";

  const db = await loadDatabase();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) {
    return send(404, { error: "Appointment not found" });
  }

  channels.forEach((channel) => {
    addNotification(appointment, {
      type,
      channel,
      recipient,
      status: "sent",
      message: `Resent ${type} via ${channel}`,
      triggered_by: actor,
      idempotency_key: `${type}:${appointment.id}:${recipient}:${channel}:resend:${Date.now()}`,
      force: true
    });
  });

  appointment.updated_at = new Date().toISOString();
  appointment.updated_by = actor;

  addAuditEntry(appointment, {
    actor,
    action: "notification_resent",
    details: { type, channels, recipient }
  });

  await saveDatabase(db);
  return send(200, normalizeAppointment(appointment));
}

async function getSummary(event) {
  const params = event?.queryStringParameters || {};
  const db = await loadDatabase();
  const filtered = applyFilters(db.appointments || [], params);
  const summary = computeSummary(filtered, params);
  return send(200, summary);
}

async function updateServicePreferences(serviceIdRaw, event) {
  const serviceId = sanitizeString(decodeURIComponent(serviceIdRaw));
  if (!serviceId) {
    return send(400, { error: "serviceId is required" });
  }

  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return send(400, { error: "Invalid JSON body" });
  }

  const prefs = await loadServicePreferences();
  const existing = prefs[serviceId] || {};
  const next = {
    reminder_one_day: payload.reminder_one_day ?? existing.reminder_one_day ?? true,
    reminder_one_hour: payload.reminder_one_hour ?? existing.reminder_one_hour ?? true
  };
  prefs[serviceId] = next;
  await saveServicePreferences(prefs);
  return send(200, next);
}

function validateCreationPayload(payload) {
  const requested_by = sanitizeString(payload?.created_by || payload?.requested_by) || "patient";
  const service_id = sanitizeString(payload?.service_id || payload?.serviceId);
  const provider_id = sanitizeString(payload?.provider_id || payload?.providerId);
  const provider_name = sanitizeString(payload?.provider_name || payload?.providerName);
  const start_time = normalizeIso(payload?.start_time || payload?.start);
  let end_time = normalizeIso(payload?.end_time || payload?.end);
  const patient_name = sanitizeString(payload?.patient_name || payload?.patientName || payload?.name);
  const patient_email = sanitizeEmail(payload?.patient_email || payload?.email);
  const patient_mobile = sanitizePhone(payload?.patient_mobile || payload?.mobile || payload?.phone);
  const service_name = sanitizeString(payload?.service_name || payload?.serviceName);
  const text_consent = Boolean(payload?.text_consent ?? payload?.sms_consent ?? payload?.consent);
  const timezone = sanitizeString(payload?.timezone);

  if (!service_id) return { valid: false, error: "service_id is required" };
  if (!provider_id) return { valid: false, error: "provider_id is required" };
  if (!start_time) return { valid: false, error: "start_time is required" };
  if (!patient_name) return { valid: false, error: "patient_name is required" };
  if (!patient_email) return { valid: false, error: "Valid patient_email is required" };
  if (!patient_mobile) return { valid: false, error: "Valid patient_mobile is required" };
  if (!text_consent) return { valid: false, error: "SMS consent is required" };

  if (!end_time) {
    const service = cachedServices?.get(service_id);
    const duration = service?.duration_min || Number(payload?.duration_min) || 30;
    end_time = addMinutesToIso(start_time, duration);
  }

  return {
    valid: true,
    service_id,
    provider_id,
    provider_name,
    service_name,
    start_time,
    end_time,
    patient_name,
    patient_email,
    patient_mobile,
    text_consent,
    timezone,
    requested_by
  };
}

function buildAppointmentUpdates(appointment, payload) {
  const updates = {};
  let hasUpdates = false;
  const actor = sanitizeString(payload.actor) || "admin";
  const auditDetails = { actor, action: "appointment_updated", details: {} };

  if (payload.patient_name !== undefined) {
    const value = sanitizeString(payload.patient_name);
    if (value && value !== appointment.patient_name) {
      updates.patient_name = value;
      auditDetails.details.patient_name = value;
      hasUpdates = true;
    }
  }
  if (payload.patient_email !== undefined) {
    const value = sanitizeEmail(payload.patient_email);
    if (value && value !== appointment.patient_email) {
      updates.patient_email = value;
      auditDetails.details.patient_email = value;
      hasUpdates = true;
    }
  }
  if (payload.patient_mobile !== undefined) {
    const value = sanitizePhone(payload.patient_mobile);
    if (value && value !== appointment.patient_mobile) {
      updates.patient_mobile = value;
      auditDetails.details.patient_mobile = value;
      hasUpdates = true;
    }
  }
  if (payload.zoom_join_url !== undefined) {
    const value = sanitizeString(payload.zoom_join_url);
    if (value) {
      updates.zoom_join_url = value;
      auditDetails.details.zoom_join_url = value;
      hasUpdates = true;
    }
  }
  if (payload.zoom_host_url !== undefined) {
    const value = sanitizeString(payload.zoom_host_url);
    if (value) {
      updates.zoom_host_url = value;
      auditDetails.details.zoom_host_url = value;
      hasUpdates = true;
    }
  }
  if (payload.notes !== undefined) {
    const value = sanitizeString(payload.notes);
    updates.notes = value || null;
    auditDetails.details.notes = value || null;
    hasUpdates = true;
  }

  if (payload.status !== undefined) {
    const status = sanitizeString(payload.status);
    if (status && STATUS_SEQUENCE.includes(status) && status !== appointment.status) {
      if (!isValidStatusTransition(appointment.status, status)) {
        return { hasUpdates: false, error: "Illegal status transition" };
      }
      updates.status = status;
      auditDetails.details.status = status;
      hasUpdates = true;
    }
  }

  if (payload.payment_status !== undefined) {
    const paymentStatus = sanitizeString(payload.payment_status);
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus) && paymentStatus !== appointment.payment_status) {
      updates.payment_status = paymentStatus;
      auditDetails.details.payment_status = paymentStatus;
      hasUpdates = true;
    }
  }

  return {
    hasUpdates,
    fields: updates,
    actor,
    auditDetails: hasUpdates ? auditDetails : null
  };
}

function isValidStatusTransition(current, next) {
  if (current === next) return true;
  const currentIndex = STATUS_SEQUENCE.indexOf(current);
  const nextIndex = STATUS_SEQUENCE.indexOf(next);
  if (currentIndex === -1 || nextIndex === -1) return true;
  if (next === "canceled") return true;
  if (next === "completed" && ["paid", "no_show"].includes(current)) return true;
  return nextIndex >= currentIndex;
}

function seedConfirmationNotifications(appointment) {
  addNotification(appointment, {
    type: "confirmation",
    channel: "email",
    recipient: "patient",
    message: `Confirmation sent to ${appointment.patient_email}`,
    triggered_by: appointment.created_by,
    idempotency_key: `confirm:${appointment.id}:patient:email`
  });
  addNotification(appointment, {
    type: "confirmation",
    channel: "text",
    recipient: "patient",
    message: `Confirmation text sent to ${appointment.patient_mobile}`,
    triggered_by: appointment.created_by,
    idempotency_key: `confirm:${appointment.id}:patient:text`
  });
  addNotification(appointment, {
    type: "confirmation",
    channel: "email",
    recipient: "provider",
    message: `Confirmation sent to provider ${appointment.provider_name}`,
    triggered_by: appointment.created_by,
    idempotency_key: `confirm:${appointment.id}:provider:email`
  });
  addNotification(appointment, {
    type: "confirmation",
    channel: "text",
    recipient: "provider",
    message: `Confirmation text sent to provider ${appointment.provider_name}`,
    triggered_by: appointment.created_by,
    idempotency_key: `confirm:${appointment.id}:provider:text`
  });
}

function buildReminderSettings(startIso, prefs = {}) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return {
      one_day: { enabled: Boolean(prefs.reminder_one_day ?? true) },
      one_hour: { enabled: Boolean(prefs.reminder_one_hour ?? true) }
    };
  }
  return {
    one_day: {
      enabled: Boolean(prefs.reminder_one_day ?? true),
      scheduled_for: prefs.reminder_one_day === false ? null : new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      status: "scheduled"
    },
    one_hour: {
      enabled: Boolean(prefs.reminder_one_hour ?? true),
      scheduled_for: prefs.reminder_one_hour === false ? null : new Date(start.getTime() - 60 * 60 * 1000).toISOString(),
      status: "scheduled"
    }
  };
}

function disableReminders(appointment) {
  if (!appointment.reminder_settings) return;
  const now = new Date().toISOString();
  for (const key of Object.keys(appointment.reminder_settings)) {
    appointment.reminder_settings[key] = {
      ...appointment.reminder_settings[key],
      status: "canceled",
      canceled_at: now
    };
  }
}

function addNotification(appointment, options) {
  const notifications = Array.isArray(appointment.notification_history)
    ? appointment.notification_history
    : (appointment.notification_history = []);

  const entry = {
    notification_id: randomUUID(),
    type: sanitizeString(options.type) || "manual",
    channel: sanitizeString(options.channel) || "email",
    recipient: sanitizeString(options.recipient) || "patient",
    status: sanitizeString(options.status) || "sent",
    message: sanitizeString(options.message) || "",
    triggered_by: sanitizeString(options.triggered_by) || "system",
    error_code: sanitizeString(options.error_code) || null,
    created_at: new Date().toISOString(),
    idempotency_key: sanitizeString(options.idempotency_key) || null
  };

  if (!NOTIFICATION_STATUSES.includes(entry.status)) {
    entry.status = "sent";
  }

  if (entry.idempotency_key && !options.force) {
    const duplicate = notifications.find((item) => item.idempotency_key === entry.idempotency_key);
    if (duplicate) {
      return duplicate;
    }
  }

  notifications.push(entry);
  return entry;
}

function addAuditEntry(appointment, details) {
  const trail = Array.isArray(appointment.audit_trail)
    ? appointment.audit_trail
    : (appointment.audit_trail = []);
  trail.push({
    id: randomUUID(),
    actor: sanitizeString(details.actor) || "system",
    action: sanitizeString(details.action) || "update",
    timestamp: new Date().toISOString(),
    details: details.details || {}
  });
}

function applyFilters(appointments, params) {
  if (!Array.isArray(appointments)) return [];
  const filters = params || {};
  const startFilter = normalizeIso(filters.start || filters.start_time || filters.from);
  const endFilter = normalizeIso(filters.end || filters.end_time || filters.to);
  const serviceId = sanitizeString(filters.service_id || filters.serviceId);
  const providerId = sanitizeString(filters.provider_id || filters.providerId);
  const status = sanitizeString(filters.status);
  const paymentStatus = sanitizeString(filters.payment_status || filters.paymentStatus);
  const search = sanitizeString(filters.search);

  return appointments
    .filter((appt) => {
      if (startFilter && (!appt.start_time || appt.start_time < startFilter)) return false;
      if (endFilter && (!appt.start_time || appt.start_time > endFilter)) return false;
      if (serviceId && appt.service_id !== serviceId) return false;
      if (providerId && appt.provider_id !== providerId) return false;
      if (status && appt.status !== status) return false;
      if (paymentStatus && appt.payment_status !== paymentStatus) return false;
      if (search) {
        const haystack = [
          appt.patient_name,
          appt.patient_email,
          appt.patient_mobile,
          appt.provider_name,
          appt.id
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
}

function computeSummary(appointments, params = {}) {
  const gross = appointments.reduce((sum, appt) => sum + (appt.payment_amount_cents || 0), 0);
  const refunds = appointments.reduce((sum, appt) => sum + (appt.refunded_total_cents || 0), 0);
  const net = gross - refunds;
  const paidCount = appointments.filter((appt) => ["succeeded", "partially_refunded"].includes(appt.payment_status)).length;
  const averageOrderValue = paidCount ? Math.round(gross / paidCount) : 0;

  const dailyTotals = {};
  for (const appt of appointments) {
    if (!appt.start_time) continue;
    const day = appt.start_time.slice(0, 10);
    if (!dailyTotals[day]) {
      dailyTotals[day] = {
        date: day,
        gross_cents: 0,
        refunds_cents: 0,
        net_cents: 0,
        count: 0
      };
    }
    dailyTotals[day].gross_cents += appt.payment_amount_cents || 0;
    dailyTotals[day].refunds_cents += appt.refunded_total_cents || 0;
    dailyTotals[day].net_cents = dailyTotals[day].gross_cents - dailyTotals[day].refunds_cents;
    dailyTotals[day].count += 1;
  }

  return {
    gross_cents: gross,
    refunds_cents: refunds,
    net_cents: net,
    paid_appointments: paidCount,
    average_order_value_cents: averageOrderValue,
    filters: params,
    daily: Object.values(dailyTotals).sort((a, b) => a.date.localeCompare(b.date))
  };
}

function normalizeAppointment(appt) {
  if (!appt) return appt;
  return {
    ...appt,
    start_time: appt.start_time,
    end_time: appt.end_time,
    payment_amount_cents: appt.payment_amount_cents || 0,
    refunded_total_cents: appt.refunded_total_cents || appt.refund_amount_cents || 0,
    notification_history: Array.isArray(appt.notification_history)
      ? appt.notification_history.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
      : [],
    audit_trail: Array.isArray(appt.audit_trail)
      ? appt.audit_trail.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
      : []
  };
}

function findConflicts({ appointments, providerId, startIso, endIso, ignoreId, bufferBefore = 0, bufferAfter = 0 }) {
  if (!Array.isArray(appointments)) return [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const bufferMsBefore = bufferBefore * 60 * 1000;
  const bufferMsAfter = bufferAfter * 60 * 1000;
  const windowStart = new Date(start.getTime() - bufferMsBefore);
  const windowEnd = new Date(end.getTime() + bufferMsAfter);

  return appointments.filter((appt) => {
    if (ignoreId && appt.id === ignoreId) return false;
    if (appt.provider_id !== providerId) return false;
    if (["canceled"].includes(appt.status)) return false;
    if (!appt.start_time || !appt.end_time) return false;
    const apptStart = new Date(appt.start_time);
    const apptEnd = new Date(appt.end_time);
    if (Number.isNaN(apptStart.getTime()) || Number.isNaN(apptEnd.getTime())) return false;
    return apptStart < windowEnd && apptEnd > windowStart;
  });
}

function computeSlotsForDate({ providers, appointments, service, date }) {
  if (!providers?.length || !service) return [];
  const serviceId = service.id;
  const duration = service.duration_min || 30;
  const bufferBefore = service.buffer_before_min || 0;
  const bufferAfter = service.buffer_after_min || 0;
  const dayOfWeek = date.getDay();
  const results = [];

  providers.forEach((provider) => {
    if (!providerSupportsService(provider, serviceId)) return;
    const slots = Array.isArray(provider.availability) ? provider.availability : [];
    slots
      .filter((slot) => Number(slot.day) === dayOfWeek)
      .forEach((slot) => {
        const startMinutes = parseTimeToMinutes(slot.start);
        const endMinutes = parseTimeToMinutes(slot.end);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return;

        for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
          const slotStart = new Date(date);
          slotStart.setHours(0, 0, 0, 0);
          slotStart.setMinutes(minutes);
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
          const conflicts = findConflicts({
            appointments,
            providerId: provider.provider_id,
            startIso: slotStart.toISOString(),
            endIso: slotEnd.toISOString(),
            bufferBefore,
            bufferAfter,
            ignoreId: null
          });
          if (conflicts.length) continue;
          results.push({
            provider_id: provider.provider_id,
            provider_name: provider.provider_name,
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString()
          });
        }
      });
  });

  results.sort((a, b) => a.start_time.localeCompare(b.start_time));
  return results;
}

function providerSupportsService(provider, serviceId) {
  const values = Array.isArray(provider.services) ? provider.services : [];
  const canonical = new Set(values.map((value) => value && value.toString()));
  return canonical.has(serviceId) || canonical.has(serviceId.replace(/^SERVICE#/i, ""));
}

function parseTimeToMinutes(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

async function loadDatabase() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.appointments || !Array.isArray(parsed.appointments)) {
      parsed.appointments = [];
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { appointments: [] };
    }
    throw error;
  }
}

async function saveDatabase(db) {
  const payload = JSON.stringify({ appointments: db.appointments || [] }, null, 2);
  await fs.writeFile(DATA_PATH, payload, "utf8");
}

async function loadServicePreferences() {
  try {
    const raw = await fs.readFile(SERVICE_PREF_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function saveServicePreferences(prefs) {
  await fs.writeFile(SERVICE_PREF_PATH, JSON.stringify(prefs, null, 2), "utf8");
}

async function loadServices() {
  if (cachedServices) return cachedServices;
  try {
    const raw = await fs.readFile(SERVICES_PATH, "utf8");
    const data = JSON.parse(raw);
    cachedServices = new Map();
    data.forEach((service) => {
      if (service?.id) {
        cachedServices.set(service.id, service);
      }
    });
  } catch (error) {
    console.error("appointments_api: unable to load services", error);
    cachedServices = new Map();
  }
  return cachedServices;
}

async function getServiceById(serviceId) {
  const services = await loadServices();
  return services.get(serviceId);
}

async function loadProviders() {
  try {
    const response = await fetchJsonFromApi(`/providers`);
    return response?.providers || [];
  } catch (error) {
    console.error("appointments_api: loadProviders failed", error);
    return [];
  }
}

async function fetchJsonFromApi(pathname) {
  if (typeof fetch !== "function") {
    return {};
  }
  const base = process.env.PROVIDERS_INTERNAL_BASE || process.env.API_BASE_URL || "";
  if (!base) return {};
  const url = new URL(pathname, base);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!res.ok) return {};
  return res.json();
}

function derivePaymentAmount(payload, service) {
  if (payload?.payment_amount_cents) {
    return { amount: Number(payload.payment_amount_cents) || 0, currency: payload.payment_currency || "usd" };
  }
  if (payload?.total_cents) {
    return { amount: Number(payload.total_cents) || 0, currency: payload.payment_currency || "usd" };
  }
  if (payload?.payment_amount) {
    const cents = normalizeCurrency(payload.payment_amount);
    return { amount: cents, currency: payload.payment_currency || "usd" };
  }
  if (service?.price?.amount) {
    return { amount: service.price.amount, currency: service.price.currency || "usd" };
  }
  return { amount: 0, currency: "usd" };
}

function normalizeChannels(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((value) => sanitizeString(value)).filter(Boolean);
  }
  return [sanitizeString(input)].filter(Boolean);
}

function normalizeIso(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function addMinutesToIso(startIso, minutes) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return startIso;
  const result = new Date(start.getTime() + Number(minutes || 0) * 60 * 1000);
  return result.toISOString();
}

function normalizeCurrency(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Math.round(value);
  const asString = String(value).trim();
  if (!asString) return undefined;
  if (asString.includes(".")) {
    return Math.round(Number(asString) * 100);
  }
  return Math.round(Number(asString));
}

function sanitizeId(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 120);
}

function sanitizeString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function sanitizeEmail(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function sanitizePhone(value) {
  if (typeof value !== "string") return undefined;
  const digits = value.replace(/[^0-9+]/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("+")) {
    if (digits.length < 8 || digits.length > 16) return undefined;
    return digits;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return undefined;
}

function buildNotificationMessage(type, recipient) {
  if (type === "manual") {
    return `Manual ${recipient} notification sent`;
  }
  return `${type} notification sent to ${recipient}`;
}

function generateZoomDetails(id) {
  const meetingId = Math.random().toString().slice(2, 13);
  const token = randomUUID();
  return {
    meetingId,
    join: `https://zoom.example.com/join/${meetingId}?token=${token}`,
    host: `https://zoom.example.com/host/${meetingId}?token=${token}`
  };
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

