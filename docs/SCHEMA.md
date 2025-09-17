# Data Model Overview

## Services (`data/services.json`)
- `id` – canonical service identifier (e.g. `SERVICE#adhd`).
- `name`, `description` – marketing copy shown during booking.
- `price.amount`, `price.currency` – stored in cents for consistent math.
- `duration_min` – base visit length.
- `buffer_before_min`, `buffer_after_min` – prep/wrap buffers respected when generating time slots.
- `cancellation_policy` – surfaced to patients on the confirmation screen.

## Providers (`providers` API)
- `provider_id` – slug ID (auto generated from name if omitted).
- `provider_name`, `first_name`, `last_name` – display names synchronized across create/update flows.
- `services` – array of service IDs the provider can deliver.
- `availability` – weekly template of `{ day: 0-6, start: "HH:MM", end: "HH:MM" }` records used to generate slots.
- Optional `email`, `phone`, `photoUrl`, `priority`.

## Appointments (`backend/appointments_api/index.mjs` persistence)
Each appointment record stored inside `data/appointments.json` contains:

| Field | Description |
|-------|-------------|
| `id` | Appointment identifier returned to the client. |
| `service_id`, `service_name` | Link back to the service offering. |
| `provider_id`, `provider_name` | Provider assigned to the visit. |
| `start_time`, `end_time` | ISO 8601 timestamps in UTC. |
| `timezone` | Display timezone recorded at booking. |
| `status` | State machine values (`draft`, `pending_payment`, `paid`, `completed`, `no_show`, `canceled`). |
| `payment_status` | Payment lifecycle (`initiated`, `succeeded`, `failed`, `partially_refunded`, `refunded`). |
| `payment_amount_cents`, `payment_currency`, `payment_reference` | Finance details used for reporting. |
| `refunds` | Array of `{ id, amount_cents, reason, actor, created_at }` entries with `refunded_total_cents` convenience field. |
| `patient_name`, `patient_email`, `patient_mobile`, `text_consent` | Contact + consent captured during booking. |
| `zoom_join_url`, `zoom_host_url`, `zoom_meeting_id` | Zoom placeholders stored with the record. |
| `cancellation_policy` | Copied from service for later reference. |
| `reminder_settings` | `{ one_day: { enabled, scheduled_for, status }, one_hour: { ... } }` updated when canceling/rescheduling. |
| `notification_history` | Array of notification attempts `{ notification_id, type, channel, recipient, status, message, error_code, created_at, idempotency_key }`. |
| `audit_trail` | Actor + action timeline `{ id, actor, action, timestamp, details }`. |
| `payment_events` | Chronological payment events (`payment_succeeded`, `refund_issued`) for timeline views. |
| `rescheduled_from` | Previous start time when rescheduling. |
| `canceled_by`, `cancellation_reason`, `canceled_at` | Metadata when an admin cancels a visit. |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Audit timestamps.

## Service Reminder Preferences (`data/service_preferences.json`)
Map of `service_id` -> `{ reminder_one_day: boolean, reminder_one_hour: boolean }` toggled from the dashboard and consumed when new appointments are created.

## Sales Summary (computed)
`GET /appointments` responses include a `summary` object with:
- `gross_cents`, `refunds_cents`, `net_cents` – totals for the filtered dataset.
- `paid_appointments`, `average_order_value_cents` – aggregate metrics.
- `daily` – array of `{ date: YYYY-MM-DD, gross_cents, refunds_cents, net_cents, count }` used by the dashboard chart.
