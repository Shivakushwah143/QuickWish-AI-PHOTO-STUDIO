# QuickWish — AI Photo Studio
## Document 03 — Combined Technical Architecture & Visual/UI/UX Design v1.0

**Document:** 03 of 03 · **Date:** 12 October 2026 · **Status:** Implementation-ready proposal, subject to listed business approvals  
**Source of truth:** PRD v1.1 + FRD v1.1 · **Parent product:** QuickWish  
**Deployment target:** Mobile-first India pilot, manual studio operation  
**Locked technologies:** React + TypeScript + Tailwind CSS; Bun + TypeScript; Neon DB PostgreSQL; Cloudinary; Groq; direct UPI QR (manual reconciliation), WhatsApp support.  
**Critical release guard:** `payment VERIFIED` AND `slot APPROVED` AND `buyer AUTHORIZED` AND `entitlement ACTIVE`.

---

## 1. Architecture Summary and Design Decisions

### 1.1 System intent

Build the smallest reliable paid-photo platform that accepts private selfies, facilitates off-site UPI payments, records manual verification, queues human production, and releases only administrator-approved images. The free birthday wish feature stays public and independent. There is **no payment gateway**, **no image-generation website API**, **no multi-admin or user account system** in MVP.

### 1.2 Decision record

| ADR | Decision | Consequence / trade-off |
|---|---|---|
| ADR-001 | React + Vite + TS + Tailwind | Fast SPA, explicit API boundary; SEO-critical gallery pages may need prerender/static HTML if indexing is a priority |
| ADR-002 | Bun HTTP API (Hono optional, not mandatory) | All security logic on server; prefer framework consistency over needless dependencies |
| ADR-003 | Neon PostgreSQL + Drizzle migrations | Correct transactions and audit; relational constraints for verified payments and slots |
| ADR-004 | Direct UPI QR/deep-link + admin receipt check | No gateway fees/integration; slower fulfillment, manual fraud and disputes workload |
| ADR-005 | Single password at `/admin` | Extremely simple UI; high-value shared credential requires strong server protections |
| ADR-006 | Cloudinary public reference + `authenticated` customer media | Prevent public original/derived access; restricted signed delivery required |
| ADR-007 | Guest capability links (not public order number) | No customer registration; lost links require secure recovery/support |
| ADR-008 | Manual ChatGPT production, independent QC approval | No model automation cost; throughput constrained by human time and usage limits |
| ADR-009 | Groq only for birthday wish generation | Keep AI key in Bun API; tool remains free and rate limited |
| ADR-010 | WhatsApp deep link for support, not automated messaging | Simple contact path; no delivery guarantees or provider API dependency |

### 1.3 Data-flow architecture (logical)

```text
PUBLIC BROWSER (React/Vite/Tailwind)
  | Home / Gallery / Style / Upload / UPI / Order status / Wish
  |                       /admin password + dashboard (protected)
  | HTTPS JSON or multipart
  v
BUN API (TypeScript)
  |-- Pricing + promo eligibility
  |-- Guest order capabilities + privacy/consent
  |-- UPI instruction & payment claims
  |-- Single-admin password, sessions, throttling
  |-- MANUAL verification transitions + audit
  |-- Slot/candidate/QC and download authorization
  |-- Groq proxy + rate limiting
  |-- WhatsApp link configuration
  |
  +--> NEON POSTGRESQL (authoritative records)
  +--> CLOUDINARY (public references; restricted private files)
  +--> GROQ (birthday text only)

EXTERNAL HUMAN ACTIONS
  Buyer ---> UPI APP ---> Receiving merchant/bank account
  Admin ---> Bank/UPI account checks credit ---> `/admin` verify
  Admin ---> Secure source/reference retrieval ---> ChatGPT manually
  Admin ---> Restricted candidate upload ---> QC approval
  Buyer ---> protected approved download
```

**Trust boundary:** Buyer-side UPI apps and uploaded screenshots cannot write authoritative bank-received status. Browser and Cloudinary URLs never decide approval. Only Bun enforces transition rules on Neon transactions.

### 1.4 Proposed repository layout

```text
quickwish/
  apps/
    web/
      src/app/routes/                 # React router pages
      src/components/{ui,studio,admin,wishes}/
      src/features/{gallery,checkout,tracking,wishes,admin}/
      src/styles/tokens.css
    api/
      src/routes/{public,uploads,orders,upi,admin,wishes}.ts
      src/modules/{payments,auth,media,orders,quality,notifications}/
      src/db/{schema.ts,connection.ts,migrations/}
      src/lib/{env,errors,validation,audit,rate-limit}.ts
  packages/shared/{types,schemas,constants}/
  docs/{prd,frd,tech-visual}/
  infra/{reverse-proxy,deploy,backup}/
```

Use shared Zod contracts for request parsing, not shared sensitive secrets. Never import admin server logic into browser bundle.

## 2. Public Routes, Admin Routes and Navigation

| Route | Access | Page purpose |
|---|---|---|
| `/` | Public | Premium homepage and value proposition |
| `/styles` | Public | All reference styles and categories |
| `/styles/:slug` | Public | Style hero, sample photos and Choose This Look CTA |
| `/create/:slug` | Public | Upload selfie, contact and processing consent |
| `/checkout/:orderCode` | Secret buyer access | Package summary, UPI QR/deep-link, amount and UTR form |
| `/order/:orderCode` | Secret buyer access | Payment verification, production progress, approved downloads |
| `/birthday-wishes` | Public | Free Groq wish generator and share controls |
| `/help` | Public | WhatsApp contact, terms, refund/delivery FAQs |
| `/privacy`, `/terms`, `/refund-policy` | Public | Legal and fulfillment information |
| `/admin` | Password-only, or active session | Password screen or authenticated overview |
| `/admin/payments` | Admin session | Submitted UTR reconciliation queue |
| `/admin/orders` | Admin session | Verified production queue + search |
| `/admin/orders/:id` | Admin session | Source/reference, candidate and slot controls |
| `/admin/styles` | Admin session | Publish/hide gallery styles and imagery |
| `/admin/settings` | Admin session | Read operational settings, permitted safe config changes |

**Routing note:** `/order/:orderCode` is not authorized by `orderCode` alone. A separate high-entropy access token is validated from an HttpOnly scoped cookie or appropriately controlled one-time exchange. Avoid guest secrets in analytics, referrer URLs and WhatsApp prefills.

## 3. Neon PostgreSQL Data Architecture

### 3.1 Database design rules

- **Neon PostgreSQL is authoritative** for prices, payment review, order status, image-slot approval, customer entitlement and audit events. Cloudinary stores file bytes and identifies asset IDs.
- Store money in **integer paise** (`amount_paise`), currency `INR`; never floating currency.
- IDs are UUIDs; human readable order code is public and non-secret (`QW-...`). Internal foreign keys are UUIDs.
- All event times are `TIMESTAMPTZ` in UTC; display in `Asia/Kolkata`.
- Make review and approval transitions transactional; only admin endpoints can update restricted columns.
- Use pooled Neon connection for application traffic; direct/admin connection for controlled migrations when driver/migration tooling requires it. Test chosen Bun+Drizzle driver combination against deployed Neon before release.
- Cloudinary secure asset public IDs are identifiers, **not** proof of authorization.

### 3.2 Entity relationship summary

```text
styles (1) ----< orders >---- (1) packages
                       |----< payment_claims >---- admin payment review
                       |----< order_assets >---- Cloudinary private selfie/proof
                       |----< image_slots >----< output_candidates
                       |----< order_access_tokens
                       |----< support_cases
                       |----< audit_events
admin_sessions ----> single logical administrator
promo_redemptions --> verified paid orders
wish_usage_events --> anonymous aggregated free feature
```

### 3.3 Canonical data dictionary

| Table | Key fields (types abbreviated) | Constraints and notes |
|---|---|---|
| `styles` | `id uuid PK`, `slug text`, `title`, `category`, `gallery_asset_id`, `reference_asset_id`, `is_published bool`, `sort_rank int`, `created_at` | Unique slug; public only when published; gallery assets owned/licensed |
| `packages` | `id uuid PK`, `code text`, `name`, `price_paise int`, `photo_count int`, `is_active bool`, `sort_rank`, `promo_limit` | Unique `code`; CHECK amount>=0 and photo_count IN (1,3,5); server price snapshot |
| `orders` | `id uuid PK`, `public_code text`, `style_id FK`, `package_id FK`, `contact_phone`, `contact_email?`, `amount_paise int`, `photo_count int`, `payment_status`, `production_status`, `consent_version`, `consented_at`, `verified_at?`, `created_at`, `updated_at` | `public_code` unique; sensitive contact not in analytics; only server mutates verified states |
| `order_assets` | `id uuid PK`, `order_id FK`, `kind enum SOURCE/UPI_PROOF`, `cloudinary_public_id`, `cloudinary_version`, `resource_type`, `delivery_type`, `mime_type`, `byte_size`, `created_at`, `deleted_at?` | All private kinds `authenticated`; never store public signed URLs; controlled deletion |
| `payment_claims` | `id uuid PK`, `order_id FK`, `utr_raw`, `utr_normalized`, `expected_paise`, `claimed_paise?`, `status`, `proof_asset_id?`, `submitted_at`, `reviewed_at?`, `review_notes?`, `receiving_vpa_snapshot`, `received_at?`, `reviewed_by` | Unique **verified** bank credit/reconciliation key; duplicate pending claims not auto-approved |
| `payment_verifications` | `id uuid PK`, `claim_id FK unique`, `order_id FK`, `bank_credit_reference`, `received_amount_paise`, `receiving_vpa`, `bank_observed_at`, `reviewed_at`, `reviewer_id`, `evidence_note` | Unique (`receiving_vpa`,`bank_credit_reference`) to prevent double funding; append-only after verify |
| `image_slots` | `id uuid PK`, `order_id FK`, `slot_index int`, `status`, `approved_candidate_id?`, `approved_at?`, `created_at`, `updated_at` | Unique (`order_id`,`slot_index`); `slot_index` 1..purchased quantity enforced by service |
| `output_candidates` | `id uuid PK`, `slot_id FK`, `asset_id`, `attempt_number int`, `qc_status`, `qc_reason?`, `created_at`, `reviewed_at?`, `reviewer_id?` | No auto-approval; attempts history retained within policy; approved candidate must belong to slot |
| `customer_access_tokens` | `id uuid PK`, `order_id FK`, `token_hash`, `expires_at`, `revoked_at?`, `created_at`, `last_used_at?` | Store HMAC/SHA-256 digest, never plaintext secret; token entropy >=128 bits |
| `admin_sessions` | `id uuid PK`, `session_hash unique`, `created_at`, `expires_at`, `last_seen_at`, `revoked_at?` | Only single logical admin; session value never returned except cookie; purge expired |
| `promo_redemptions` | `id uuid PK`, `order_id FK unique`, `promo_code`, `customer_fingerprint_hash?`, `redeemed_at` | Only verified paid order creates redemption; limits enforced transactionally; uniqueness limited without verified identity |
| `support_cases` | `id uuid PK`, `order_id FK`, `case_type`, `status`, `reason`, `resolution`, `opened_at`, `closed_at?` | Human correction/refund and reconciliation history |
| `audit_events` | `id uuid PK`, `order_id?`, `actor_type`, `action`, `entity_type`, `entity_id`, `detail_jsonb`, `created_at` | Append-only actor/time/outcome, no secrets or face pixels |
| `wish_usage_events` | `id uuid PK`, `day date`, `anonymous_bucket_hash?`, `outcome`, `latency_ms`, `model_id`, `created_at` | Minimal, limited retention; do not store wish names by default |

### 3.4 Business status enums and constraints

**Payment:** `NOT_SUBMITTED`, `CLAIM_PENDING_REVIEW`, `NEEDS_INFO`, `DUPLICATE_FLAGGED`, `REJECTED`, `VERIFIED`, `REFUND_PENDING`, `REFUNDED`, `EXPIRED`.

**Production:** `DRAFT`, `PAYMENT_UNVERIFIED`, `QUEUED`, `IN_PROGRESS`, `QC_PENDING`, `PARTIALLY_READY`, `READY`, `REVISION_REQUIRED`, `COMPLETED`, `CLOSED`.

**Image slot:** `WAITING`, `GENERATING`, `CANDIDATE_UPLOADED`, `REJECTED`, `APPROVED`.

**Candidate QC:** `QC_PENDING`, `REJECTED`, `APPROVED`.

Apply CHECK constraints for positive attempts, photo count, supported currency and nonnegative money. Use `NOT NULL`, FK indexes and cascade/restrict decisions deliberately. Do not use cascading deletes for verified financial evidence; honor retention policy by deleting media and minimizing PII while retaining records required for lawful accounting.

### 3.5 Index and concurrency plan

- Index: `orders(public_code)` unique; `orders(payment_status,created_at)` and `orders(production_status,updated_at)` for queue.
- `payment_claims(order_id,submitted_at DESC)`; `payment_claims(status,submitted_at)`; normalized UTR index for investigation, **not unique on mere submission**.
- Unique `payment_verifications(receiving_vpa,bank_credit_reference)` and `payment_verifications(claim_id)`; independent bank-reference validation needed.
- Unique `image_slots(order_id,slot_index)`; `output_candidates(slot_id,attempt_number)`; `customer_access_tokens(token_hash)` unique; `admin_sessions(session_hash)` unique.
- Admin verify-payment transaction: lock order + claim (`SELECT ... FOR UPDATE`), assert expected amount/payee and independent evidence, assert credit key unused, insert `payment_verifications`, update payment and order queue, increment valid promo redemption when applicable, insert audit, commit. Duplicate submit returns previous result; collision is a review error.
- Admin image approval: lock slot and order, require VERIFIED and candidate belongs to slot; update candidate to APPROVED and `image_slots.approved_candidate_id`; recompute aggregate order status transactionally; audit, commit.

### 3.6 Example SQL for critical integrity boundaries

```sql
-- Illustrative PostgreSQL excerpt; final Drizzle migrations must mirror it.
CREATE UNIQUE INDEX uq_payment_verified_credit
  ON payment_verifications (receiving_vpa, bank_credit_reference);

CREATE UNIQUE INDEX uq_order_slot_index
  ON image_slots (order_id, slot_index);

CREATE UNIQUE INDEX uq_candidate_attempt
  ON output_candidates (slot_id, attempt_number);

CREATE UNIQUE INDEX uq_guest_token_hash
  ON customer_access_tokens (token_hash);

-- Amount is stored as integer minor units: 49 INR == 4900 paise.
ALTER TABLE orders ADD CONSTRAINT ck_order_amount_nonnegative
  CHECK (amount_paise >= 0);
```

**Note:** This is an integrity excerpt, not a standalone migration; create base tables first through versioned Drizzle migrations. Do not execute it before verifying actual deployed schema names.

## 4. UPI QR Payment — Exact Functional and Technical Flow

### 4.1 Why QR without gateway changes the lifecycle

A QR code is **payment instructions**, not a payment verification API. When a visitor pays through PhonePe, Google Pay, Paytm or their bank app, QuickWish receives no trusted automatic success event. Users can forge screenshots, mistype UTRs or pay the wrong amount. Therefore every claimed transfer must be reconciled by the admin against the actual receiving account before work or downloads.

### 4.2 Transaction sequence

```text
Buyer                 React UI            Bun API / Neon         UPI App/Bank             Admin
 | choose style/package |                       |                     |                       |
 |--------------------->| create priced draft   |                     |                       |
 |                      |---------------------->| order + claim slot  |                       |
 |                      |<----------------------| QR payload + price  |                       |
 | scan QR/open app     |                       |                     |                       |
 |--------------------------------------------------------------->| buyer transfers INR  |
 | submit UTR/proof     |                       |                     |                       |
 |--------------------->| POST claim            |                     |                       |
 |                      |---------------------->| CLAIM_PENDING_REVIEW|                       |
 | sees pending review  |<----------------------|                     |                       |
 |                      |                       |                     |<--- checks real credit|
 |                      |                       |<---------------------------- verify/reject     |
 |                      |                       | VERIFIED or NEEDS_INFO    |                   |
 | opens order link     | GET status            |                     |                       |
 |--------------------->|---------------------->| QUEUED only if verified                      |
```

### 4.3 QR payload design

Build the UPI intent **on Bun server** using the configured merchant payee, quote and order code; render as QR in browser from trusted server payload (or return a server-generated SVG/PNG). Example fields (not actual merchant account):

```text
upi://pay?pa=MERCHANT_VPA&pn=QuickWish&am=49.00&cu=INR&tn=QW-ORDER123
```

URL-encode fields. Optionally supply `tr`/order reference where supported, but **do not rely on all UPI apps preserving `tn`/`tr` or locking `am`**. Show merchant VPA and amount in plain text. Offer **Pay via UPI app**, QR and **Copy UPI ID** to accommodate same-phone and cross-device behavior. Never require banking credentials or a UPI PIN inside QuickWish.

### 4.4 Payment proof and reconciliation

- UTR/reference: buyer-entered free-format normalized field; configure length/pattern after testing across providers. Optional screenshot proof stored as Cloudinary `authenticated` image.
- Amount expected: database price snapshot (e.g., 4900 paise). A claimed amount is a hint, not proof. Record receiving VPA snapshot for the attempt.
- Admin must observe actual credited entry and independently confirm receiver, actual amount, reference and that it has not been used for another order. Use payer/time/order note as supplemental information.
- Ambiguous or partially matched credit: NEEDS_INFO, not VERIFIED. Only explicit admin reconciliation can resolve.
- Manual refunds require a real outgoing payment and confirmed settlement. Never claim automatic refunds.
- If `VERIFIED`, candidate approval and valid buyer link are still required for download.

### 4.5 ₹19 first-50 eligibility

Treat first 50 as an **operations-controlled promotion**, not an accurate identity guarantee. During verification of qualifying payment (not UTR submission), atomically check remaining redemptions, the stored price agreement and manual anti-duplicate contact evidence. If promo capacity is exhausted before payment, buyer must see and agree to regular price. If credit was sent under a previously issued ₹19 quote during a race, honor it or process a documented customer-approved resolution; do not silently demand extra money. An abandoned UPI screen is not a redemption.

## 5. `/admin` — Single-Password Authentication & Authorization

### 5.1 Required user experience

`GET /admin` without a session renders a simple premium password screen with only **Password**, Show/Hide toggle, **Unlock dashboard**, error text, and QuickWish branding. No username/email/forgot-password/signup flow. Correct password opens `/admin` overview.

### 5.2 Threat model and safeguards

- Store only `ADMIN_PASSWORD_HASH` in server environment / secret manager; generate hash with Argon2id and high-entropy admin password. Never store or send plaintext password in frontend, git or DB query logs.
- On login: validate body length, throttle per IP and globally, verify password in constant-time-friendly password-hash API, create opaque random session token, persist only its hash in Neon, set HttpOnly Secure SameSite=Lax/Strict cookie, rotate after login. No JWT/localStorage required.
- Protect every `/api/admin/*` route with session middleware and CSRF protection on state mutations; check same-origin Origin/Referer + anti-CSRF strategy. Require TLS, strong session secret and security headers.
- Suggested engineering default: 30 minutes idle timeout, 12 hours absolute session lifetime, server revocation on logout; final values configurable after owner's usability review.
- Throttle example: progressive delay plus cooldown after repeated failures per IP and global spike detection; avoid permanent global lockout that lets attackers deny service to the sole admin.
- On password rotation: update hash securely and revoke existing sessions. Backup access is infrastructure/operator control, not a second hidden application password.
- `/admin` is a **publicly knowable route**; no security by obscurity. Frontend protected routes must never substitute for server authorization.

### 5.3 Admin dashboard information architecture

**Overview:** unverified UPI count, verified/queued orders, due soon, candidates awaiting QC, completed today, exceptions, manual fulfillment time.

**Payments:** Pending / Needs info / Verified / Rejected; view UTR, expected amount, restricted proof and controlled Verify/Reject actions with required acknowledgment of independent bank check.

**Orders:** Queue, In production, QC, Ready, Completed, Closed; search by order code, contact (safely), category; filters by status/date; operational sorting.

**Order detail:** Reference + private selfie; payment verification badge; package+slot counts; per-slot candidate/QC; attempt log; private deliverable upload; approve/reject; support/refund history; sanitized audit trail.

**Gallery manager:** Upload original/authorized references, assign category, alt text and publish/hide. **Settings:** display safe published hours and WhatsApp number, not admin password or secret configuration values.

## 6. Cloudinary Media Security & Delivery

### 6.1 Distinct media classes

| Class | Storage/delivery | Customer visibility |
|---|---|---|
| Public sample/reference | Ordinary public Cloudinary delivery after licensing review | Anyone |
| Buyer source selfie | `authenticated` delivery type; private identifier | Authorized admin only; buyer upload preview locally |
| UPI screenshot/proof | `authenticated` | Authorized admin only |
| Candidate generated image | `authenticated` | Admin only until explicitly approved |
| Final approved output | `authenticated` | Buyer with VERIFIED payment + approved slot + active entitlement + valid guest access |
| Optional preview (P1) | Separate pre-rendered low-res/watermarked restricted asset | Only authorized buyer with approved release rule for previews |

### 6.2 Server-mediated upload and download

- For source/proof upload, use Bun-issued single-use short-lived signed upload parameters or server-mediated upload, never unsigned open presets accepting arbitrary public files. Verify MIME by magic bytes, max bytes, image dimensions, malware/media scanning as appropriate and Cloudinary response type/public ID. Bind asset to an authorized order and expected purpose; validate finalize callback server-side.
- For admin final upload, require admin session and a verified paid slot. Always save as `authenticated` and start QC_PENDING.
- For download, POST/GET authorized request on Bun → Neon policy check → issue **short-lived Cloudinary private_download_url** (or proxy-stream using provider auth) scoped to approved asset. Do not send original IDs or unexpiring signed URLs to unauthenticated users.
- Signed delivery URL alone is not a buyer permission check and may be shared while valid; always keep TTL short and recheck before issuing new grants. Choose URL expiration compatible with download UX (proposed 60–120 seconds) and note already downloaded files cannot be remotely revoked.
- Use `Cache-Control: no-store` on protected API responses, a strict referrer policy, no-index order/admin pages and a separate public/CDN cache policy for gallery.
- Cloudinary's `private` originals can leave derived transforms public, so use **`authenticated`** for protected media. Review account tier and transfer cost, avoid assuming advanced premium token/cookie features are available.

### 6.3 Media retention

Define TTL policy separately for original selfies, UPI screenshots, rejected candidates, final output, expired drafts and admin laptop copies. Do not fabricate business/legal retention periods. Build a scheduled deletion process with idempotent Cloudinary delete, Neon tombstone, retry/audit, customer deletion/support handling and backup-aware policy.

## 7. Backend API Contracts (Bun, Versioned)

**Conventions:** `/api/v1`; JSON UTF-8; RFC 7807-inspired error format `{code,message,requestId,fieldErrors?}` without sensitive internals. Authenticated guest access through secure token-exchange + scoped cookie; admin session separate from buyer cookie. `Idempotency-Key` on repeated write actions. UUIDs in internal objects; public order codes for humans.

### 7.1 Public catalog and wishlist

| Method | Route | Request | Response / security |
|---|---|---|---|
| GET | `/api/v1/styles?category=` | category, cursor | Published style previews only; cacheable |
| GET | `/api/v1/styles/:slug` | slug | Published style detail and public asset reference |
| GET | `/api/v1/packages` | none | Active packages and introductory offer availability note; no entitlements |
| GET | `/api/v1/config/public` | none | Support WhatsApp URL, review hours, disclaimers; no secrets |
| POST | `/api/v1/wishes` | name, relationship?, tone?, language? | Generated text or 429/503; rate limited |

### 7.2 Buyer order and upload

| Method | Route | Request | Response / security |
|---|---|---|---|
| POST | `/api/v1/orders` | styleId, packageCode, contact, consentVersion, upload intent | `orderCode`, scoped capability exchange, amountPaise, status DRAFT; server prices |
| POST | `/api/v1/orders/:code/uploads/sign` | purpose, mime, bytes; buyer capability | One-time restricted upload signing/validation |
| POST | `/api/v1/orders/:code/uploads/complete` | cloudinary upload receipt | Validate ownership and `authenticated`; bind source/proof |
| GET | `/api/v1/orders/:code/payment-instructions` | buyer capability | Merchant name, VPA, amount, UPI intent URI, expiry/help text |
| POST | `/api/v1/orders/:code/payment-claims` | `utr`, claimedAmount?, proofAssetId? | 202 `CLAIM_PENDING_REVIEW`, never VERIFIED |
| POST | `/api/v1/orders/:code/access/exchange` | signed out-of-band secret | Set scoped HttpOnly cookie; no plaintext token persisted |
| GET | `/api/v1/orders/:code` | scoped buyer session | Safe order status, approved slots and help |
| POST | `/api/v1/orders/:code/slots/:slotId/download` | scoped buyer session | Short-lived authorized download URL/stream or 403 |

### 7.3 Password-only admin and operations

| Method | Route | Request | Response / security |
|---|---|---|---|
| POST | `/api/v1/admin/login` | password | Authenticated session cookie; throttled; no username |
| GET | `/api/v1/admin/session` | cookie | Boolean session/status; no password data |
| POST | `/api/v1/admin/logout` | cookie + CSRF guard | Revoke server session |
| GET | `/api/v1/admin/overview` | cookie | Dashboard aggregates |
| GET | `/api/v1/admin/payment-claims?status=` | cookie | Private claims queue |
| POST | `/api/v1/admin/payment-claims/:id/verify` | confirmed bankReference, actualAmountPaise, receivedAt, evidenceNote, independentCheck=true | Neon transaction; VERIFIED or conflict |
| POST | `/api/v1/admin/payment-claims/:id/resolve` | status, reason | NEEDS_INFO / REJECTED / DUPLICATE_FLAGGED |
| GET | `/api/v1/admin/orders?status=` | cookie | Production/orders queue |
| GET | `/api/v1/admin/orders/:id` | cookie | Full admin-safe order, slots, file access intents |
| POST | `/api/v1/admin/slots/:id/candidates` | restricted upload receipt, attempt number | QC_PENDING candidate |
| POST | `/api/v1/admin/candidates/:id/review` | decision APPROVE/REJECT, reasons | Transactional candidate + slot state update |
| POST | `/api/v1/admin/orders/:id/cases` | type, note, resolution | Support/refund case |
| POST | `/api/v1/admin/styles` | style metadata & verified owned media ID | Publish/unpublish as authorized |

**Admin verification payload caution:** Never have an API perform the bank-check itself by simply trusting `independentCheck=true`. It is a recorded declaration of the human reviewer who must substantiate it from the external bank account; this is an organizational control, not cryptographic bank evidence. Without a gateway or bank API, the platform cannot independently establish payment truth.

### 7.4 Example state-dependent responses

```json
// POST /orders/QW-X/payment-claims — HTTP 202
{
  "orderCode": "QW-X",
  "claimStatus": "CLAIM_PENDING_REVIEW",
  "message": "We'll verify your UPI payment manually before production starts."
}
```

```json
// GET /orders/QW-X (after separately authenticated secret-link exchange)
{
  "orderCode": "QW-X",
  "paymentStatus": "VERIFIED",
  "productionStatus": "PARTIALLY_READY",
  "slots": [
    {"index": 1, "status": "APPROVED", "downloadable": true},
    {"index": 2, "status": "QC_PENDING", "downloadable": false},
    {"index": 3, "status": "WAITING", "downloadable": false}
  ]
}
```

**Payloads illustrative:** Never expose signed Cloudinary source or permanent final URLs in public status JSON. Validate exact contracts using shared Zod schemas.

## 8. Production Engineering & Security Operations

### 8.1 Secrets and environment contract

| Server-only variable | Use |
|---|---|
| `DATABASE_URL` | Neon pooled application connection (TLS) |
| `DATABASE_DIRECT_URL` | Migration/maintenance connection, if driver needs it |
| `ADMIN_PASSWORD_HASH` | One configured salted slow-hashed password |
| `SESSION_SECRET` | Session signing/CSRF material where applicable; rotate safely |
| `CLOUDINARY_CLOUD_NAME` | Provider cloud account |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Signed upload/download/delete, server only |
| `GROQ_API_KEY`, `GROQ_MODEL` | Birthday message backend calls |
| `UPI_MERCHANT_VPA`, `UPI_MERCHANT_NAME` | Displayed verified merchant payment details |
| `SUPPORT_WHATSAPP_E164` | Business WhatsApp support link |
| `PUBLIC_APP_URL` | Canonical secure application URL |

Frontend may receive **public merchant VPA/name and WhatsApp number**, but must never receive admin hash, DB URL or API secrets. All values must be validated on server startup; disallow placeholder live merchant details.

### 8.2 Deployment topology

Browser → HTTPS reverse proxy (Caddy/Nginx) → React built static files and Bun API container/process → Neon over SSL + Cloudinary/Groq outbound HTTPS. Deploy Bun privately behind reverse proxy; make `/healthz` lightweight and `/readyz` check dependencies if needed. Put limits on upload body sizes, API rate and process resources.

Keep secrets in VPS secret-managed environment rather than repo or baked frontend bundle. Use automated database backups/PITR per Neon plan, tested restore procedure, file retention housekeeping, error alerting and structured logs with request ID.

### 8.3 Security and operational testing matrix

| Risk/test | Pass condition |
|---|---|
| Fake UTR claim | Remains unverified; no queue/work/download |
| Duplicate bank reference | DB uniqueness prevents two verified orders for one real credit |
| Admin password brute force | Throttling/cooldown, no password or hash exposure |
| CSRF on admin verify | Rejected without verified origin/token; session cookie not enough by itself |
| Cloudinary unprotected variation | Source, proof, candidate and original inaccessible anonymously, including transformations |
| Leaked guest code | Human order code alone insufficient to access private data |
| Signed download expires | New request requires current entitlement; wrong order rejected |
| Concurrent admin action | Transaction/idempotency prevents duplicate payment/approval events |
| Payment verified but QC not approved | Download forbidden |
| Multiple photo slots | Each separately authorized, pending slots inaccessible |
| Groq outage | User-visible safe error; no provider secrets/logs exposed |
| Phone 320px; keyboard / screen reader | No overflow, usable controls, labels and status announcements |

## 9. Visual Identity — Premium Editorial Photography, Not Generic AI

### 9.1 Direction and design psychology

**Brand personality:** calm, credible, aspirational, human, refined. The photography should carry visual emotion; UI stays restrained. Avoid overly neon gradients, fake 3D robot icons, heavy glassmorphism, aggressive “AI” aesthetics or misleading “100% realistic” badges. A friendly variation of the same system powers birthday wishes without making the photo studio childish.

**Preferred palette:** Warm Ivory + Ink + Forest Green + Muted Copper, with blush accent reserved for birthday wishes. This palette supports natural portrait skin tones and looks premium on mobile.

### 9.2 Design tokens — production CSS values

| Token | Hex | Intended use |
|---|---|---|
| `--canvas` | `#F8F7F2` | Warm-ivory page background |
| `--surface` | `#FFFFFF` | Card and dialog surfaces |
| `--ink` | `#172B28` | Primary text, premium dark background |
| `--ink-soft` | `#52635E` | Supporting copy |
| `--forest` | `#20564A` | Primary buttons and selected controls |
| `--forest-hover` | `#163E35` | Primary hover/pressed |
| `--copper` | `#B66B4B` | Subtle premium editorial accent, not body text on white |
| `--peach` | `#F4DFD7` | Birthday-wish accent background |
| `--border` | `#DEE4DE` | Hairline borders |
| `--success` | `#276847` | Verified/approved status |
| `--warning` | `#895600` | Pending review text on light surfaces |
| `--danger` | `#B33131` | Payment mismatch/rejected errors |
| `--focus` | `#255EAB` | Accessible keyboard focus ring |

**Contrast discipline:** Primary ink on ivory; white on forest; high-contrast status copy. Never use copper on ivory for long text without verifying WCAG contrast. Reserve status colors for actual system states, not decorative badges.

### 9.3 Fonts and scale

- **Display / editorial:** *Fraunces* (`'Fraunces', Georgia, serif`) for hero headlines, occasional pull quotes and premium section titles. Use restrained medium weights, not all uppercase.
- **Interface / body:** *Manrope* (`'Manrope', system-ui, sans-serif`) for buttons, forms, prices, instructions, labels and tables. Chosen for crisp modern UI.
- **Indic fallback:** *Noto Sans Devanagari* where Hindi content is supported; system fallback otherwise. Test actual glyph coverage and localized wrapping.
- **Numbers, QR and UTR:** Manrope with `font-variant-numeric: tabular-nums`; copyable monospace UTR values where clarity matters.

| Typography | Desktop | Mobile | Rules |
|---|---|---|---|
| Hero H1 | 60–72px / 1.06 | 36–44px / 1.12 | Fraunces 500–600, 9–11 words max visually |
| Section H2 | 40–48px / 1.12 | 30–34px / 1.15 | Fraunces |
| Card title | 21–24px / 1.25 | 19–21px / 1.3 | Manrope 650 or editorial serif where meaningful |
| Body | 16–18px / 1.6 | 15–16px / 1.55 | Manrope 400/500 |
| Label | 13–14px / 1.4 | 13–14px / 1.4 | Manrope 600 |
| Button | 15–16px / 1 | 15–16px / 1 | Manrope 700, 48–52px target |
| Caption | 12–13px / 1.45 | 12–13px / 1.45 | Do not rely on captions for critical policy |

Use font files from their licensed sources (e.g., hosted Google Fonts or self-hosted permitted files), optimize subsets/font-display; do not embed externally licensed font binaries in delivered docs.

### 9.4 Layout and component geometry

- Spacing system: 4px base grid: 4/8/12/16/24/32/48/64/96.
- Container: desktop max-width 1200–1280px, responsive side padding 48–64px; tablet 24–32px; phone 16–20px.
- Cards: photo cards 16–20px radius; buttons 12px; inputs 12px; dialog 20px. Use subtle shadows and fine borders; avoid stacked heavy shadows.
- Primary CTA: forest fill/white text; hover forest-dark; focus ring blue; loading spinner + disabled double-submission.
- Gallery cards: vertical portrait aspect ratio 3:4, object-fit cover, meaningful alt text; avoid cropped faces; consistent gutter 12–18px.
- Buttons/inputs: minimum 44x44px hit areas, default 48–52px height; upload drop-zone 160px+ with accessible Browse fallback.
- Motion: subtle 150–240ms transforms/fades; disable nonessential animation for reduced-motion preference.
- Above-fold: photography, clear one-sentence promise, **Browse styles** primary CTA, **How it works** secondary, starting price, natural AI disclosure.

### 9.5 Tailwind design foundation (illustrative)

```css
:root {
  --canvas: #F8F7F2;
  --surface: #FFFFFF;
  --ink: #172B28;
  --ink-soft: #52635E;
  --forest: #20564A;
  --forest-hover: #163E35;
  --copper: #B66B4B;
  --peach: #F4DFD7;
  --border: #DEE4DE;
  --focus: #255EAB;
}
body { background: var(--canvas); color: var(--ink); font-family: 'Manrope', system-ui, sans-serif; }
h1, h2.editorial, .editorial-title { font-family: 'Fraunces', Georgia, serif; }
*:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

## 10. Complete Customer-Facing Screen Specifications

### 10.1 S01 — Homepage `/`

**Desktop:** 72px navigation with wordmark left, Gallery/Birthday Wishes/How it works center, Help top-right; 2-column hero with left editorial text and right art-directed portrait/paired collage; under hero a 3-step strip, curated six-photo gallery, quality principles, pricing cards, FAQ, photo safety/trust and footer. **Mobile:** 64px topbar (logo + compact menu), one-column portrait-first hero with CTA above long text, 2-column thumbnails, horizontally scrollable pricing cards only if accessible; sticky **Browse styles** CTA in scroll region, no aggressive popups.

**Copy suggestion:** H1 “A photo you love. A look that's yours.” Body: “Choose a style, upload your selfie, and get a realistic AI portrait reviewed by our studio.” CTA “Explore photo styles” and secondary “See how it works”. Fine print “AI-generated imagery. Facial likeness may vary.”

**States:** Normal, slow photos (blur placeholder/skeleton), empty curated gallery (hide section), network error (retry). **Success signal:** gallery open or selection, not just hero impressions.

### 10.2 S02 — Photo Style Gallery `/styles`

Search/filter row for Cinematic, Fashion, Traditional, Professional, Vintage and Lifestyle. Desktop 4-column 3:4 portrait grid with style name and simple “View style” action; tablet 3 columns; mobile 2 columns. Include realistic faces and genuine photographic variety, not repetitive AI-perfect plastic skin. Filters work keyboard/mobile and update URL query. Empty state offers reset. Lazy-load below fold with fixed image ratio to avoid layout shift.

### 10.3 S03 — Style Detail `/styles/:slug`

Large hero photo (60% desktop) and right purchase composition panel: style name, short visual description, what's retained/changed, start price, realism disclosure, CTA “Use this style”. Mobile: photo edge-to-edge within safe gutters, sticky bottom CTA, specifics below. Optionally display multiple licensed/owned samples. No counterfeit fake customer reviews or “exact same result” promise.

### 10.4 S04 — Photo Upload + Consent `/create/:slug`

Progress breadcrumb `1 Style → 2 Selfie → 3 Package → 4 UPI`. Large simple drop-zone with JPEG/PNG/WebP instructions and image preview, remove/replace option, safe file limits; privacy notice placed next to upload; mandatory unchecked consent toggle/checkbox with link to policy; contact phone (for support/payment reconciliation) and optional email, contact warning about not treating WhatsApp as automated delivery. CTA “Continue to packages”. Mobile photo preview, large buttons, keyboard-safe form. **States:** not selected, validating, uploading, success, invalid, upload failed, permission/consent blocked.

### 10.5 S05 — Package Selection

Three/four simple package cards, regular price and photo quantity. Introductory offer emphasized only when available; distinguish raw generations from approved deliverables. Order summary shows style and uploaded selfie preview, quantity, price in INR and delivery/revision policy. CTA “Continue to UPI payment”. Active selection has forest outline and clearly labelled radio semantics; no dark pattern. Mobile stack cards and sticky price bar; selected price must match server snapshot.

### 10.6 S06 — UPI QR Checkout `/checkout/:orderCode`

Central payment card: **Pay ₹49 to QuickWish**, payee name, verified merchant UPI ID display, sufficiently large QR (at least 220px rendered), “Open UPI app” primary on phones, copy merchant UPI ID + amount, public order code in readable mono, steps `1 Pay → 2 Return → 3 Enter UTR → 4 We verify manually`. Prominent note “Do not send your UPI PIN here. We verify your payment manually; this may take time during support hours.” WhatsApp help after concise self-help steps.

**After payment:** UTR field and optional screenshot upload; submit button “I have paid — request verification” (NOT “Payment successful”). **States:** QR loading/fallback, active payment instructions, UTR invalid, claim submitted, verification pending, wrong amount/needs info, verified/queued, duplicate or rejected claim; support CTA at all exception states. No fake automatic spinner implying bank polling.

### 10.7 S07 — Order Tracking `/order/:orderCode`

Desktop narrow readable central timeline with summary sidebar; mobile single column. Show order code, style thumbnail, package count, payment review status, production timeline and separate slot cards. During PAYMENT_UNVERIFIED show amber neutral messaging and support link. Only APPROVED slots show “Download full-quality” actions. Partially ready example: `1 of 3 portraits ready`. If order secret expires, show generic private-access recovery via WhatsApp. Never show bank account information or customer source as publicly cacheable media.

### 10.8 S08 — Secure Download and Thank You

Approved photo image is visible only through protected access; large “Download original” button, format/resolution information, sharing instructions and optional quality feedback link. Pending slots remain separated. No prompt-engineering controls, AI sliders or editor implied. Download errors give Retry/Help. On mobile, save-to-device guidance should be platform-neutral (not claim an image is saved automatically).

### 10.9 S09 — Birthday Wishes `/birthday-wishes`

Use friendly warm blush accent on a still premium warm-ivory base. A single elegant form: recipient name (required), relationship, language and tone chips. Primary CTA “Write my wish”; result card with nicely typeset message, Copy, Share and Regenerate within published free usage limits. On mobile, form and result stack; on desktop, side-by-side with an unobtrusive celebration illustration or gradient texture. Do not ask birthday person's photo, user signup or payment. States: empty/validation, generating, success, rate limited, Groq failure, copy success.

### 10.10 S10 — Help / FAQs / Trust Policies

Help page with WhatsApp CTA, clear payment-verification and manual delivery expectations, how to find UTR, cancellation/refund summary, supported selfie formats, image retention and AI disclosure. Do not suggest that a screenshot instantly verifies a transfer. Privacy/Terms/Refund links remain reachable from every paid screen. No fake trust badges.

## 11. Complete Admin Screen Specifications

### 11.1 A01 — `/admin` single-password login

**Desktop:** Centered 420px white card on warm ivory background with compact QuickWish icon, title “Studio admin”, a single password input, show/hide, Unlock Dashboard primary button and secure session note. **Mobile:** Full-width card with 16–20px gutters and appropriately sized field; no logo hero eating screen height. No username, registration, reset link or employee selector. States: idle, validating, invalid password, temporarily rate-limited, expired session. Hide internal technical errors. Avoid fetching private orders before session is confirmed.

### 11.2 A02 — Admin Overview `/admin`

**Desktop:** slim left navigation (Overview, Payments, Orders, Gallery, Settings, Logout), top summary and 4 compact KPI tiles `UPI claims awaiting review`, `Paid orders in queue`, `QC pending`, `At risk of delay`, followed by actionable queues. **Mobile:** topbar + accessible drawer/bottom navigation; never force a wide admin data table. Counts read from backend with clear timestamps; avoid high-frequency polling during pilot.

### 11.3 A03 — Payment Review `/admin/payments`

Desktop split-list and detail pane. Left list displays order code, expected INR amount, UTR, received time, status and urgency. Right shows buyer proof (protected), quote, claimed reference, and a non-optional checklist: “I independently checked receiving bank credit”, “Receiver matches”, “Amount matches”, “Reference not used elsewhere”. Buttons **Verify payment** (confirmation modal), **Needs info**, **Reject**, **Flag duplicate**. The checkbox does not itself verify the bank; it records a human process step. Mobile: claim cards → full-screen detail → sticky action dock. Strongly distinguish amber pending and green verified; screenshot is labelled “Customer-provided evidence — not confirmation.”

### 11.4 A04 — Orders Queue `/admin/orders`

Tabs: Verified, In production, QC, Ready, Completed, Exceptions. Compact cards/table with order code, package quantity, verification time, required slot progress, delivery deadline and next action. Search by order number or contact safely; filter by age. CTA opens order details. Unverified payments must not appear under Paid/Production.

### 11.5 A05 — Order Detail + QC `/admin/orders/:id`

Desktop two-column workspace: left private source and selected public reference side-by-side; right payment VERIFIED banner, buyer contact, package, slot statuses, manual generation progress and upload controls. Each slot has attempt counter, candidate preview, quality checklist, Reject with reason, Approve (explicit confirmation). Mobile source/reference cards stack and slot controls become accordion sections. Audit timeline below: claim → verified → started → candidate → QC → approved → download. No direct editable VERIFIED/APPROVED text inputs. Admin only.

### 11.6 A06 — Admin Gallery Manager and Settings

Grid of reference styles with thumbnail, title, category, publication switch; create/edit style with original/licensed media, descriptive alt and preview. Settings screen shows business review hours, approved public WhatsApp contact and retention warning; backend-only secrets and password hashes never displayed. All mutations audited.

## 12. Responsive Layout Matrix & Interaction States

| Breakpoint | Width | Navigation | Gallery | Checkout / tracking | Admin |
|---|---|---|---|---|---|
| Compact phone | 320–374px | Minimal topbar + drawer | 2 columns 8–12px gap | One column; full-width QR card; no horizontal scroll | Card list, full-width login/actions |
| Standard phone | 375–599px | Minimal topbar | 2 columns 12px gap | One column; sticky contextual CTA | Drawer + stacked status cards |
| Tablet | 600–899px | Condensed header | 3 columns | Centered 580px stepper/QR panel | Adaptive two-pane or cards |
| Small desktop | 900–1199px | Full top navigation | 3–4 columns | Centered two-column content when useful | Sidebar + 1 content panel |
| Wide desktop | 1200px+ | Full nav, max 1280px | 4 columns | Two-column summary/flow up to 1100px | Sidebar + split details + queue |

**Page states every screen must cover:** initial, loading skeleton, empty, field invalid, network/server error, rate limited, success, disabled action and accessible focus. Financial and QC screens additionally cover pending review, rejected, needs info, verified, partial fulfillment, stale action conflict, session expired and policy/race changes.

### 12.1 Accessibility and usability rules

- Accessible contrast verified on real components; don't convey payment approval solely with color.
- Every upload, password, UTR and consent control has a label and field-level error; form errors focus appropriate field/summary.
- Keyboard accessible dialogs and escape/focus trap; 44px+ targets; screen-reader live status for image upload and Groq generation.
- Make QR alternative with UPI deep-link and copyable VPA for low-vision or same-device use; provide text payment instructions.
- No hidden price, prechecked consent, forced testimonials, or countdown timer that implies false urgency.
- Loading placeholders preserve image aspect ratios; mobile gallery above fold should render quickly on ordinary Indian networks.

## 13. UI Wireframes — Layout Contracts (Not Final Photography Assets)

### 13.1 Mobile public purchase route

```text
+-----------------------------------+
| QuickWish             [Menu]      |
|-----------------------------------|
| A photo you love.                 |
| A look that's yours.             |
| [ Explore photo styles ]          |
| AI-generated • Human reviewed     |
|                                   |
| [  Portrait  ] [ Portrait ]       |
| [  Portrait  ] [ Portrait ]       |
|                                   |
| Style selected: Cinematic 07      |
| [ Upload your selfie             ]|
| [I consent to AI processing]      |
| [ Continue to packages ]          |
|                                   |
| Pay ₹49 to QuickWish              |
| [        UPI QR           ]        |
| [ Open UPI app ] [ Copy ID ]      |
| Reference: QW-XXXX                |
| UTR [___________________]          |
| [ Request manual verification ]   |
| Verification may take time        |
| [ WhatsApp assistance ]           |
+-----------------------------------+
```

### 13.2 Mobile guest order tracking

```text
+-----------------------------------+
| [Back] Your photo order           |
| QW-XXXX                           |
| [ VERIFIED ✓ ] [In production]    |
|                                   |
|  1 / 3 photos ready              |
|  [ Image 1 preview / restricted ] |
|  [ Download full quality ]        |
|  [ Image 2: quality review ]      |
|  [ Image 3: waiting ]             |
|                                   |
| How long will it take? [Info]     |
| [ Need help? WhatsApp ]           |
+-----------------------------------+
```

### 13.3 Desktop admin layout

```text
+-------------------------------------------------------------------+
| QuickWish Studio admin           Search ...           Logout       |
|-----------+-------------------------------------------------------|
| Overview  | Payments requiring review [12]  QC pending [5]      |
| Payments  |-------------------------------------------------------|
| Orders    | CLAIMS                  | REVIEW DETAILS              |
| Gallery   | QW-1028  ₹49 Pending    | Order QW-1028              |
| Settings  | QW-1029  ₹99 Pending    | UTR: ************          |
|           | QW-1030  ₹19 NeedsInfo  | Proof: buyer screenshot     |
|           |                         | [ ] Checked actual credit  |
|           |                         | [ Verify ] [ Needs info ]  |
|-----------+-------------------------------------------------------|
| All verification decisions audited; screenshot ≠ bank credit      |
+-------------------------------------------------------------------+
```

These wireframes capture structure and interactions, not real customer photographs. Final visual assets must be original or licensed and pass realism/QC checks.

## 14. Performance, SEO, Analytics and QA

### 14.1 Performance proposal

Start with targets: LCP <=2.5s on representative tested mobile configuration; CLS <=0.1; INP <=200ms; monitor rather than promise universal achievement. Serve correctly sized public Cloudinary images (`srcset`, AVIF/WebP where supported) while never creating public versions of restricted media. Route-level code-splitting for admin/wishes; lazy-load below-fold galleries. Avoid shipping Groq libraries or secrets to frontend.

### 14.2 SEO and measurement

Public home/gallery/style pages require human-readable metadata, Open Graph images using **public licensed** media, canonical URLs and a sitemap; consider Vite prerender or SSR only if crawlability testing justifies the complexity. `/admin`, `/order`, checkout and all customer-private URLs should be `noindex` and non-cacheable. Track qualified gallery visitors, style selection, package selection, UTR submission, VERIFIED payment, QC attempts, download grant, support/refund and birthday success **without personal photos, bank data or guest secrets**.

### 14.3 Test strategy

- Unit: quote calculations, promo eligibility, input constraints, UPI URI encoding, status transition policy, download authorization predicate, rate limiting.
- DB integration: verify payment credit uniqueness under concurrency; reject two claims from same bank credit; slot approval FK integrity; token/session expiry.
- Security: signed Cloudinary URL restrictions, unapproved image and guessed order access, admin unauthorized APIs, CSRF, login throttling, XSS-safe rendering and secure headers.
- Full manual E2E: valid UPI sample with real receiving-account review, false screenshot, wrong amount, ₹19 promo capacity, 1/3/5 slots, rejection/rework, secure download, refund, support and free birthday wishes.
- Visual QA: 320px/375px/768px/1024px/1440px screenshots, keyboard, screen reader, low bandwidth, Android Chrome and iOS Safari.
- Business QA: Time full admin payment verification, manual generation, QC and fulfillment; check whether ₹49 can contribute positively.

## 15. Implementation Milestones (Dependency Order)

| Milestone | Build slice | Exit condition |
|---|---|---|
| M0 | Config + repo + Neon migrations + audit + `/healthz` | Staging healthy, secrets protected |
| M1 | Public gallery/style, visual design tokens, licensed assets | Mobile gallery and navigation reviewed |
| M2 | Buyer upload/consent, guest order capability, pricing | Private photo stays protected; quote immutable |
| M3 | QR/deep-link checkout, UTR claims, `/admin` password + payments queue | False proof never verifies; real credit manually reconciled |
| M4 | Production queue, candidates, QC approval, per-slot download | 1/3/5-photo full manual workflow passes |
| M5 | Free Groq wishes, WhatsApp help, policies, privacy cleanup | Feature paths and rate limits pass |
| M6 | Security, responsiveness, operational QA, launch decision | PRD/FRD release gates met |

## 16. Product Decisions Still Awaiting Owner Approval

| Decision | Recommendation, not locked policy |
|---|---|
| Payment review hours and target | Publish realistic human availability; do not claim instant confirmation |
| Customer delivery deadline | Derive from hands-on sample test timings |
| Merchant name/VPA and WhatsApp | Enter in secure deployment config after ownership check |
| Revision policy | Offer bounded remedies, not “unlimited changes” |
| Refund triggers and transfer timing | Publish specific cases and manually tracked settlement |
| Guest token lifetime | Recommend 7–30 days, with secure support-based rotation, subject to privacy policy |
| Download signed-link lifetime | Recommend 60–120 seconds; test large file download on mobile |
| Original/proof/final retention | Set legal/operational TTL policy before launch; build deletion job |
| Allowed upload and UTR formats | Validate actual target device/bank samples, avoid false rejections |
| 50-buyer promotion identity criteria | Manual eligibility review + honest inability to prevent all duplicates without identity verification |
| Public style/brand name | Working label “AI Photo Studio” under QuickWish |

## 17. Source Notes and Implementation References

These are provider documentation references, not guarantees that a particular plan or account has premium features. Reverify installed library versions and service plans during implementation.

- [Cloudinary — Control access to media](https://cloudinary.com/documentation/control_access_to_media) — authenticated delivery vs private originals and transformed variants.
- [Cloudinary — Upload API](https://cloudinary.com/documentation/image_upload_api_reference) — delivery `type`, signed uploads, media metadata.
- [Neon — Postgres and connection pooling](https://neon.com/docs/connect/connection-pooling) — pooled application connections.
- [Drizzle — PostgreSQL with Bun SQL](https://orm.drizzle.team/docs/connect-bun-sql) — driver compatibility option; pin and test production versions.
- [OWASP — Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — Argon2id or equivalent.
- [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — secure session cookies and token handling.
- [Groq — Rate Limits](https://console.groq.com/docs/rate-limits) — per-project/provider call limits.
- [UPI official overview — NPCI](https://www.npci.org.in/what-we-do/upi/product-overview) — payment ecosystem; manual reconciliation is QuickWish's business control.

---

**Completion statement:** Document 03 maps PRD v1.1/FRD v1.1 into Neon entities, Bun API interfaces, UPI manual verification, single-password `/admin` security, Cloudinary approval-gated media delivery, Groq birthday functionality, complete public/admin screen specifications, brand typography/colors, mobile-responsive layouts, risks and release tests. No gateway or automated image-generation integration is in the MVP.
