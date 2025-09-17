Project MVP Edina Clinic Telehealth
Region us east 1
API API Gateway HTTP API
Lambdas telehealth_appointments_get telehealth_notes unified_booking
DB DynamoDB table appointments pk APPT#<id> sk v0
Front end GoDaddy Website Builder custom HTML blocks saved in frontend

See `docs/PRODUCT_SPEC.md` for the full product requirements including texting, notifications, and the Appointments & Sales dashboard.
Appointments API (local JSON persistence via `backend/appointments_api/index.mjs`) powers booking confirmations, notifications, refunds, and the sales dashboard.
Admin UI lives in `frontend/admin.html`.

