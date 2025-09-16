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
