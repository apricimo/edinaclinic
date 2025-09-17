# Backend Architecture

## Unified Router
- `backend/unified_booking/index.mjs` keeps the Lambda entrypoint minimal: handles `OPTIONS` and `/ping`, then delegates `/checkout` & `/services` to `booking_api` and all `/providers` paths to `providers_api`.

## Booking API
- `backend/booking_api/index.mjs` serves booking-specific endpoints (`GET /services`, `POST /checkout`, `GET /ping`). It validates service IDs against `data/services.json`, resolves Stripe credentials via environment or Secrets Manager, and creates Checkout Sessions.

## Providers API
- `backend/providers_api/index.mjs` encapsulates provider CRUD backed by the `providers` DynamoDB table. Routes:
  - `GET /providers` – returns all providers sorted by `priority`.
  - `GET /providers/{id}` – retrieves a single provider.
  - `POST /providers` – creates a provider record.
  - `PUT /providers/{id}` – updates allowed provider fields.
  - `DELETE /providers/{id}` – removes the provider.

## Appointments API
- `backend/appointments_api/index.mjs` orchestrates appointment creation, updates, cancellations, reschedules, refunds, and notification logging.
- Persists appointment data in `data/appointments.json` to keep the specification runnable in local environments without DynamoDB.
- Exposes routes for
  - `GET /appointments` with filter support (date range, service, provider, payment status, appointment status, search).
  - `POST /appointments` to create an appointment, compute Zoom placeholders, seed confirmation notifications, and schedule reminders.
  - `POST /appointments/{id}/cancel|reschedule|refund` to drive dashboard actions.
  - `POST /appointments/{id}/notifications` and `/notifications/resend` to log manual outreach or resend confirmations idempotently.
  - `GET /appointments/summary` for sales metrics and `/services/preferences` to toggle reminder defaults per service.

## Frontend Dashboards
- `frontend/booking.html` now runs the full booking flow: service selection, date/time picking based on provider availability, patient details (email, mobile, SMS consent), and confirmation with resend + calendar support. It calls the appointments API to create records and surfaces the Zoom join link, cancellation policy, and reminder expectations.
- `frontend/admin.html` provides the Appointments &amp; Sales dashboard featuring filters, real-time sales metrics, a daily chart, reminder preference toggles, appointment detail view, and actions for cancel/reschedule/refund/resend/manual messaging.

## Shared Library (`backend/lib`)
- `http.js` – common API Gateway helpers (`send`, `parseJsonBody`) with shared CORS headers.
- `ddb.js` – lazily initialises an AWS SDK v3 `DynamoDBDocumentClient` and exposes tiny helpers for common operations.
- Other modules (e.g. `stripe.js`, `secrets.js`) support the booking flow.

## Data
- `data/services.json` – service metadata consumed by the booking API for validation and pricing.

## Testing
- `backend/lib/http.test.mjs` exercises the HTTP helper to keep request parsing and response shaping predictable.

## Deployment Notes
- Deploy the router (`backend/unified_booking/index.mjs`) to the existing Lambda so both booking and provider flows stay consolidated while code paths remain modular.
