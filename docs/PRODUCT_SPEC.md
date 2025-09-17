# Telehealth Booking Platform Specification

## Overview
- **Title:** Telehealth booking site with patient texting, provider texting, and an admin dashboard for appointments and sales.
- **Single source of truth:** All writes flow through the backend so the database remains authoritative. The UI refreshes from persisted state after every mutation. Lightweight domain events (e.g., provider updated, appointment paid, refund issued) keep the booking site and dashboards synchronized through polling or push updates.

## Core Requirements
- **Contact collection:** Booking requires patient name, email, and mobile number. Mobile numbers are validated for format and country.
- **Dual-channel notifications:** After successful payment the system sends the Zoom join link and appointment details by both email and text to the patient and to the assigned provider (provider receives the host link). Notification identifiers prevent duplicate sends, and retries handle transient failures.
- **Consent:** Patients must opt in to receive appointment-related texts before completing booking.

## Patient Booking Experience
1. Patient selects a service and an available time from the calendar.
2. Patient enters name, email, mobile number, and accepts text messaging consent.
3. Patient completes payment.
4. Confirmation screen displays service, provider, start time, Zoom link, and cancellation policy, and notes that confirmation email and text were sent.
5. Patient can trigger a resend of confirmation messages from the confirmation screen.
6. Automated reminder texts and emails (default one day and one hour before) include the Zoom link, cancellation window, and an "add to calendar" shortcut.

## Provider Notifications
- Providers receive email and text messages when an appointment is paid. Messages include Zoom host link, patient name, time, and service.
- If the assigned provider changes via the admin dashboard, updated details are re-sent to the new provider, and the patient is notified of the change.

## Admin Dashboard – Appointments and Sales
- Dedicated page lists all appointments with filters for date range, service, provider, payment status, and appointment status.
- Each row displays patient name, service, start time, provider, payment amount, payment status, and appointment status.
- Selecting a row opens a detail view with complete metadata, Zoom fields, notification history, and an activity log.
- Admins can create appointments manually (e.g., phone bookings) while keeping payment and notification flows intact.
- Bulk actions support resending confirmations and exporting filtered data to CSV.

### Cancellation Flow
- Canceling an upcoming appointment updates status, frees the time slot, and sends cancellation email and text to both patient and provider.
- When payment exists, admins choose refund or credit per policy. Refund actions update payment status and log the notification.
- Cancellation reason and actor are recorded for auditing.

### Reschedule Flow
- Admin selects a new time validated by the same availability logic and service buffers.
- System sends updated confirmations by email and text to patient and provider, releases the original slot, and records a pointer to the previous appointment time.

### Refunds and Receipts
- Supports full and partial refunds with recorded amount, processor refund ID, and reason.
- Patient receives email receipt and confirmation text for refunds.
- Sales metrics update in real time to reflect refunds.

### Sales Overview
- Summary bar (respecting active filters) shows gross sales, refunds, net sales, paid appointment count, and average order value.
- Simple daily totals chart highlights trends.
- Totals reconcile against payment processor events for accuracy.

### Notification Center
- Appointment detail view lists every notification with channel, timestamp, status (queued, sent, failed), and error codes if applicable.
- Admin can resend email or text, and send a manual message with the Zoom link.
- Failed texts suggest correcting the phone number before retrying.

## Compliance and Patient Consent
- Text messaging is limited to appointment-related updates (confirmation, reminders, reschedules, cancellations, refunds, failed payments).
- Consent checkbox is required during booking; records of consent are stored with the appointment.

## Reminder Management
- Default reminders: 24-hour and 1-hour before start.
- Admin dashboard exposes per-service toggles to enable or disable reminders.
- Reminders respect cancellation status and do not fire for canceled or refunded appointments.

## Data Model Additions
- **Appointments:** `patient_mobile`, notification history entries (email and text), `cancellation_reason`, `canceled_by`, `refund_amount`, `refund_id`, `rescheduled_from`, reminder toggle metadata, consent flag.
- **Providers:** Optional `mobile_number` for operational texts.
- **Audit Trail:** Records actor, timestamp, action, and before/after values for every admin change.

## Operational Model
- **Events:** Provider updated, service updated, availability updated, appointment created, appointment paid, appointment canceled, appointment rescheduled, refund issued, notification sent, reminder scheduled.
- **Status machines:**
  - Appointments: `draft → pending payment → paid → (canceled | rescheduled | completed | no show)` with refund paths as applicable.
  - Payments: `initiated → succeeded → refunded` (with failure branch).
  - Notifications: `queued → sent`, with `failed` branch supporting retries.
- **Roles & permissions:**
  - Admin: manage providers, services, availability, appointments, refunds, reports.
  - Provider: view own schedule, receive notifications, optionally manage availability.
  - Patient: book and manage own appointment details.
- **Security:** Admin and provider areas require authentication and support optional MFA.

## Availability & Scheduling Controls
- Providers can set recurring availability, away dates, vacation ranges, and one-off overrides.
- Service-level buffers for prep and wrap time prevent back-to-back conflicts.
- System enforces time zone clarity, daylight saving adjustments, and prevents overlaps or double booking (including holds for pending payments with expiration).
- Holds automatically release if checkout is abandoned.

## Notification Lifecycle
- Templates cover confirmation, reminders, reschedule, cancel, refund, and failed payment for both patient and provider, across email and text.
- Quiet hours can throttle outbound texts when required.
- Notification history prevents duplicate sends via idempotency keys and records retries with short backoff for texts.

## Finance & Policy
- Store cancel and refund policies per service and display them to patients.
- Sales reporting includes per-service and per-provider revenue, daily close report (gross, refunds, net, appointment count, average order value), and reconciles with processor events.
- Support promo codes and tax calculations if needed.

## Security & Compliance
- Encrypt sensitive data in transit and at rest; avoid logging full contact info.
- Verify webhooks, store secrets in environment configuration, and document data retention for notifications and audits.
- Plan for HIPAA compliance (BAAs, access logging, least privilege) as the product matures.

## Reliability & Recovery
- Maintain regular backups with tested restore paths.
- Use idempotency keys for payments and webhooks to avoid duplicate work.
- Apply rate limiting and abuse protection on public endpoints.
- Alert on failures in payment flows, Zoom link generation, text delivery, and availability generation.

## Operations & Observability
- Structured logging with appointment IDs for traceability.
- Metrics for booking conversion, payment success rate, text/email delivery success, refund and cancellation rates, show rate, and average wait to next availability.
- Dashboards and alerting ensure on-call visibility.

## Intake & Pre-Visit Readiness
- Optional pre-visit questionnaire tied to appointments, including e-sign consent and attachment uploads (insurance card, referrals).
- Forms and assets live on the appointment record so providers can review ahead of time.

## Provider Experience
- Providers can claim profiles, manage mobile numbers, and view upcoming appointments with join/start links.
- Support personal blackout dates independent of standard availability.

## Data Access & Export
- CSV exports for providers, services, and appointments with filter support.
- Redacted exports for support and a data dictionary describing each field.

## Internationalization & Accessibility
- All copy lives in templates for future localization.
- UI adheres to accessibility best practices (keyboard navigation, screen reader support).

## Performance & UX
- Keep payloads small, use pagination, and favor confirmed state over optimistic updates.
- Provide clear error states with recovery guidance.

## Testing & Release
- Unit tests cover availability logic and status transitions.
- End-to-end tests exercise the booking journey from service selection through payment and notification delivery.
- Provide sandbox modes for payments and Zoom, plus feature flags for riskier capabilities (e.g., partial refunds, provider self-service).

## Governance & Documentation
- Maintain a living spec with roles, routes, events, statuses, and notification templates.
- Provide a support runbook for common scenarios (incorrect contact info, refund, reschedule, failed webhook).

## Build Sign-off Checklist
- Booking collects name, email, mobile number, and obtains SMS consent.
- Patients receive confirmation emails and texts with Zoom join links after payment.
- Providers receive confirmation emails and texts with Zoom host links.
- Admin Appointments and Sales page supports cancellation, reschedule, refunds/credits, and keeps schedule/calendar synchronized.
- Sales totals and appointment counts are accurate for any chosen date range.
- Notification history is searchable, supports resend, and prevents duplicate sends or reminders post-cancel.
