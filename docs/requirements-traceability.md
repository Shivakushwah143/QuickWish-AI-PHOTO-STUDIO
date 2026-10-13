# Requirement traceability and honest test scope

| Scope / FRD tests | Implementation | Verification |
|---|---|---|
| Catalog / style selection | web main.tsx; styles API; seed.ts | Build/typecheck; browser suite supplied |
| Consent, upload, immutable quote AT-01/02 | shared contracts; orders and uploads routes | Policy tests; local API flow |
| UPI intent AT-03/21 | shared upiIntent; Checkout | URI test; actual UPI/device NOT RUN |
| Claim is unverified AT-04/06 | claims routes; admin review desk | API flow; policy test; fake receipt treated as claim |
| Independent verified credit AT-05/08 | verification transaction, exact amount/payee, notes | Local API demo wrong-amount/happy-flow checks; actual bank NOT RUN |
| Duplicate credit / idempotency AT-07/22 | unique verification constraints; row locks | DB constraints + repeated API verify; real parallel Neon NOT RUN |
| Password-only auth AT-09/10 | security.ts, admin login/session/logout | Local API login; browser-only-input test supplied |
| Approval gate AT-11/12/24 | QC transaction + SQL trigger + download policy | DB, policy, local API checks |
| Multi-slot isolation AT-13/14/15 | candidate ownership composite FK; replacement rejection | DB/API partial ready and unauthorized denial |
| Expired capability AT-16 | token expiry queries; support rotation | Query implemented; browser/session expiry still requires operator QA |
| Refund/revocation AT-17 | full refund transaction; entitlement check | Local API revocation; real refund NOT RUN |
| Groq AT-18/19 | wishes endpoint, DB rate limits, provider timeout | Live completion checked; model correction; policy tests; UI browser test supplied |
| Promotion AT-20 | advisory-locked persistent reservations; separate redemptions | Database separation test; real concurrency NOT RUN |
| Cloudinary AT-23 | authenticated media; server-only signed proxy | Live upload/delivery and unsigned original/transform checks; see live-verification.json |
| Privacy / deletion | consent version, re-encode, cleanup, no-store | DB private-delivery check; retention/backup operations not launch certified |
| Support / policies | Help/policy pages; admin/guest cases | Implemented; owner policy approval outstanding |
| Gallery & package operations | admin gallery and settings | Implemented; production licensed-image review outstanding |

Tests are targeted, not complete certification of all AT-01–24. `test:local` uses an embedded PostgreSQL protocol harness, not Neon. Browser installation and heavy tests were deliberately avoided. See verification-report.md for actual outcomes.
