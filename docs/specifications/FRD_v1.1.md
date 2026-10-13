# QuickWish — AI Photo Studio
## Functional Requirements Document (FRD) v1.1

**Document:** 02 of 03 · **Date:** 12 October 2026 · **Status:** Revised functional draft  
**Parent:** QuickWish · **Product:** AI Photo Studio + Free Birthday Wish Generator  
**Source:** PRD v1.1 · **Database:** Neon DB PostgreSQL · **API:** Bun + TypeScript  
**Changed since v1.0:** Manual UPI QR / bank verification replaces payment gateway and webhooks; `/admin` becomes a single-password login. WhatsApp support is P0. **Core product, packages, images, consent, manual ChatGPT, Groq free feature and per-image approval are unchanged.**

---

## 1. Purpose, Scope and Vocabulary

This FRD specifies the observable behavior of every actor and state transition. Document 03 owns DB DDL, concrete endpoints, data types, Cloudinary access mechanisms and wireframes. Terms in UPPERCASE indicate business statuses rather than claims about underlying providers.

**Required release invariant:** `payment_state == VERIFIED` AND `image_slot == APPROVED` AND `requester == AUTHORIZED` AND `entitlement == ACTIVE` before any full-quality download. Submitted UTRs, screenshots and visible “payment successful” app screens never satisfy payment verification.

**Actors:** A public visitor, an adult buyer with a secret order link, an unauthenticated birthday-wish visitor, and one password-authenticated admin. Supporting services: receiving UPI/bank account, Neon PostgreSQL, Cloudinary, Groq, and manually used ChatGPT. No gateway or automated image generation.

**P0:** launch blocker. **P1:** explicitly optional/later. **TBD:** requires owner sign-off, not a hidden default.

## 2. Journey Catalogue

| ID | Entry | Successful result |
|---|---|---|
| WF-01 | Home/gallery | Customer selects published style |
| WF-02 | Style/upload | Valid private selfie, consent and contact details collected |
| WF-03 | Packages/UPI | Backend creates immutable priced order + displays QR/deep-link |
| WF-04 | Payment confirmation form | Customer submits UTR claim; status remains UNVERIFIED |
| WF-05 | `/admin` → payments | Admin independently matches real credit and verifies or rejects claim |
| WF-06 | Guest order link | Buyer sees authorized payment, production and slot progress |
| WF-07 | Admin paid queue | Manual ChatGPT production and protected candidate upload |
| WF-08 | Admin QC | Each candidate rejected/reworked or individually approved |
| WF-09 | Customer order link | Authorized buyer downloads individually approved originals |
| WF-10 | Help/exception | Wrong amount, unclear UTR, duplicate, correction/refund resolved |
| WF-11 | Birthday Wishes | Free Groq message created, copied/shared |
| WF-12 | `/admin` | Password login, session expiry, logout and bad-attempt protections |

## 3. End-to-End User Workflows

### 3.1 WF-01 → WF-04: Buyer order and UPI submission — successful journey

1. Buyer visits QuickWish; sees original/licensed photo styles, before/after samples, photorealism positioning, published turnaround and AI-generated disclosure.
2. Buyer browses categories, chooses a style. System saves a stable style ID and display thumbnail; unavailable styles cannot be ordered.
3. Buyer opens an order composer and uploads a permitted selfie. Client displays file restrictions, an upload progress state and safe retry; server validates actual file bytes/type/size, then stores it as restricted Cloudinary media.
4. Buyer supplies a reachable contact channel for fulfillment/support and affirmatively accepts versioned third-party photo-processing and privacy notices. Unchecked consent blocks proceeding.
5. Buyer chooses exactly one active package (₹19 eligible introductory single, ₹49 single, ₹99 three, ₹149 five). Backend derives package quantity and amount; values posted by browser cannot override pricing.
6. Backend saves draft and purchased slot count, public order code, private access token/hash, price snapshot and payment attempt. Buyer receives a copyable private order link.
7. Payment screen displays merchant display name, UPI ID, order code, exact amount and (a) a scannable UPI QR, (b) a Pay in UPI App action for supported mobile devices, and (c) merchant UPI ID copy fallback. UI makes clear UPI apps may permit editing of amount or note, so buyer must check them before paying.
8. Buyer pays outside the website. Website does not claim to know whether this succeeded. Buyer returns and submits transaction reference/UTR; an optional payment screenshot may be uploaded as evidence but is not required to establish a credit.
9. Server creates **PENDING_REVIEW** payment claim, timestamps it and shows “Waiting for manual payment verification”. No production slot is eligible yet. WhatsApp help is available with the public order code prefilled, without embedding secret access token in the WhatsApp message.
10. Buyer can refresh, close or revisit their secret link. UI continues to show **PAYMENT_UNVERIFIED** until admin reconciliation. Admin eventually independently verifies the receiving-bank credit and marks verified (WF-05).
11. After verified payment, the customer sees **Order accepted · In production queue**. Manual fulfillment and QC follow WF-07–WF-09.

**Non-happy path:** Invalid upload, unchecked consent, unavailable style, stale price, promo exhausted, failed UPI transfer, wrong amount, missing UTR, expired payment window, lost network, duplicate claim and uncertain credit must show distinct recoverable states. Never convert a claim into verified credit by client action alone.

### 3.2 WF-05: Admin independently verifies payment

1. Admin opens `/admin`, enters only the configured password, and receives a secure session on successful server-side verification.
2. Admin selects **Payments → Awaiting verification**; sees order, immutable expected amount, buyer-supplied UTR, optional private screenshot, claim submission time and receiving UPI ID. Does not see passwords or order-link tokens.
3. Admin checks the **actual receiving bank/UPI merchant account** outside the website and locates incoming credit with matching merchant account, actual received amount and reference (with time, payer and order note as secondary checks). A screenshot alone is insufficient.
4. If exactly matched, admin selects **Verify payment**, records bank observation metadata without uploading unnecessary banking details, and confirms. Server atomically marks the claim VERIFIED, payment VERIFIED and production eligible, while logging admin ID (single-admin identifier), timestamp and evidence reference. Duplicate clicks must be idempotent.
5. If mismatch or ambiguity, admin chooses **Needs clarification**, **Reject claim**, or **Duplicate/suspected fraud** with mandatory reason. The customer sees accurate next steps and WhatsApp assistance; photo production stays blocked.
6. Admin must never mark VERIFIED solely from a buyer-provided UTR without independent receipt verification. A credited payment with incorrect amount is held for manual top-up/refund decision; cannot silently change contracted package.
7. Customer remains entitled to a fair reconciliation process for late credited payments and disputes. Manual refund is recorded only when an actual return transfer/settlement is independently confirmed.

**Security invariant:** Never allow another order to reuse a verified bank transaction. Duplicate/ambiguous UTR claims are flagged. A verified credit is unique and associated with exactly one order; check amount and receiver as well.

### 3.3 WF-06: Guest order tracking (no customer account)

1. Buyer opens a high-entropy secret order link from confirmation; backend hashes/validates token, checks expiry/revocation and scopes access to one order.
2. Tracking page shows public order code, style thumbnail, safe status, promised window, purchased slot count, payment review state, WhatsApp assistance and only permitted assets.
3. During unverified payment: “Awaiting manual UPI verification”; during accepted work: “In queue / Creating your photos / Quality review”; after approval: “Ready to download”.
4. Refreshing or reopening the link never advances a status. User cannot edit payment/approval flags in browser. Unauthorized requests return neutral access errors without order existence leakage.
5. Expired/lost link routes to support verification and manual reissue; do not recover access using guessable order number or phone alone.

### 3.4 WF-07: Administrator manually produces photo

1. Admin opens only **VERIFIED** paid orders in **Production Queue**. Unverified claims remain in Payments queue and are not treated as revenue or workload.
2. Admin opens order; verifies consent, style, package quantity, source-photo permission and current deadline; retrieves the protected customer source and chosen reference via authorized short-lived access.
3. Admin uses the photographs manually in ChatGPT according to applicable provider terms, does not automate consumer web access, and avoids collecting extraneous customer details.
4. Admin checks resulting likeness, natural textures, lighting, human anatomy and reference-inspired composition; logs attempt number and time spent.
5. Admin uploads the finished candidate to **one specific purchased slot** into protected Cloudinary storage; the candidate starts **QC_PENDING**, not approved.
6. For multi-photo packages, admin repeats per slot. If generation or external service fails, admin marks rework/blocked with reason and contacts support when promised delivery is at risk.
7. Admin deletes unnecessary local working copies on the approved retention schedule.

### 3.5 WF-08: Admin quality gate

1. Admin opens uploaded candidate and a quality checklist. The photo has no public original URL and no customer download entitlement.
2. Admin reviews recognizable face, natural skin, eyes/hands, lighting/shadows, body proportions, visual artifacts, intended style, and unsafe/deceptive imagery.
3. If pass: admin explicitly presses **Approve image**; server logs who, when, slot and candidate version; updates individual slot status.
4. If fail: admin selects **Reject / Regenerate** and gives reason; slot returns to revision; rejected candidates remain inaccessible to customer.
5. A multi-photo order can be **PARTIALLY_READY**. Each approved slot becomes downloadable independently; pending slots remain protected.
6. Simply uploading a candidate, paying, changing client-side UI, or marking an aggregate order READY cannot bypass approval of each slot.

### 3.6 WF-09: Buyer downloads approved photographs

1. Buyer opens a valid secret order link and sees eligible image slots only.
2. Buyer taps Download on an approved slot. Backend rereads current Neon data; requires payment VERIFIED, target slot APPROVED, active entitlement, valid buyer access and exact order/slot ownership.
3. Backend issues a narrowly scoped **short-lived** protected download response/link, then records the grant. Any future attempt rechecks current state.
4. Downloaded image is full-quality and unwatermarked according to purchased package. Browser reload cannot reveal a permanent public Cloudinary original URL.
5. Trying someone else's ID, expired token, unverified order, unapproved candidate, revoked entitlement or wrong slot returns denial and no private media bytes.

### 3.7 WF-10: Payment and production exceptions

**Wrong amount:** claim remains non-verified until admin documents top-up/refund/repricing path and independently confirms credited total. **UPI payment done, UTR not submitted:** no automatic receipt inference; customer may submit later/contact WhatsApp. **Fraudulent screenshot:** rejected; preserve minimal audit. **Duplicate UTR:** investigate; never verify the same real credit twice. **Late credit:** admin reconciles and informs customer. **Quality mismatch:** bounded manual rework and case notes. **Refund:** manual UPI/bank transfer, reference/amount/settlement recorded; customer not marked REFUNDED until confirmed; entitlement updated per approved refund policy. **Lost link:** safe owner-verification via support without exposing order access to strangers. **Admin unavailable:** customer sees clear review hours and delay support.

### 3.8 WF-11: Free birthday wishes

1. Visitor opens `/birthday-wishes` anonymously, enters recipient name and optionally relationship, tone and language.
2. Frontend and backend validate inputs; name cannot be empty or unreasonably long.
3. Backend rate limits, calls Groq with server-only API key and constrained prompt, and returns greeting text without exposing raw provider credentials.
4. UI offers copy and native share/fallback actions; success and failure are clearly announced.
5. On rate limit/provider outage, visitor receives a helpful retry message; no photo order, payment or account is required.

### 3.9 WF-12: One-password `/admin` entry and logout

1. Navigating to `/admin` without valid session opens a polished password-only sign-in screen; **no username, email, registration or reset-by-email UI**.
2. Admin submits password to protected Bun login endpoint. Password verification occurs exclusively on server against securely stored hash; a successful login creates/rotates an opaque session in an HttpOnly Secure SameSite cookie.
3. Incorrect attempts receive neutral feedback without hinting password validity or server configuration. Apply IP/device and global throttles; show appropriate cooldown. Never echo password to logs.
4. Browser reload keeps session until expiry; protected `/admin/*` API calls always validate the session server-side. `/admin` path secrecy is not considered authentication.
5. Logout invalidates the session. Expiry redirects to the password screen without leaking order data. Password changes occur through a controlled deployment/admin secret rotation process, not public self-service.

## 4. Requirement Catalogue — P0 Unless Marked P1

### 4.1 Public gallery and identity

| ID | P | Acceptance rule |
|---|---|---|
| FR-PUB-01 | P0 | Home shows product value, honest AI disclosure, featured styles, visible starting price and clear CTA. |
| FR-PUB-02 | P0 | Gallery supports category browse and style detail without login; hidden styles aren't orderable. |
| FR-PUB-03 | P0 | Selecting style preserves published ID/version through order draft. |
| FR-PUB-04 | P0 | Images used in public gallery are owned/licensed and do not reveal customers' private originals. |
| FR-PUB-05 | P0 | Navigation clearly separates paid AI Studio from free Birthday Wishes; WhatsApp help visible. |
| FR-PUB-06 | P1 | Favorites, advanced search, campaigns and accounts deferred. |

### 4.2 Upload, consent and draft

| ID | P | Acceptance rule |
|---|---|---|
| FR-UPL-01 | P0 | Only configured supported photo MIME types/sizes/dimensions accepted, revalidated server-side. |
| FR-UPL-02 | P0 | Customer uploaded sources are restricted media and cannot be accessed by a public URL. |
| FR-UPL-03 | P0 | Frontend shows selected photo and progress without publishing originals or exposing secret URLs. |
| FR-UPL-04 | P0 | Explicit opt-in to third-party AI processing required before checkout. Store notice version and timestamp. |
| FR-UPL-05 | P0 | One adult buyer/pilot with photo-upload rights; invalid or suspicious content can be refused. |
| FR-UPL-06 | P0 | Contact path is collected and used for support/reconciliation; secret access link issued. |
| FR-UPL-07 | P0 | Draft can be safely resumed using authorized access; expired orphaned images cleaned per policy. |

### 4.3 UPI pricing and claims

| ID | P | Acceptance rule |
|---|---|---|
| FR-UPI-01 | P0 | Backend fixes price in integer INR minor units for chosen active package; no client price override. |
| FR-UPI-02 | P0 | QR shows receiving merchant name/UPI ID, order reference and exact display price; mobile UPI deep-link offered. |
| FR-UPI-03 | P0 | Client says user must confirm payee/amount in payment app; app callback/screenshot does not mean verified. |
| FR-UPI-04 | P0 | Customer submits normalized UTR/reference; optional private screenshot saved only as evidence. |
| FR-UPI-05 | P0 | Submission sets CLAIM_PENDING_REVIEW and order PAYMENT_UNVERIFIED, never VERIFIED. |
| FR-UPI-06 | P0 | Admin independently matches credited payment in receiving account to reference, amount and payee before verification. |
| FR-UPI-07 | P0 | One verified real transfer can fund at most one order; repeated review actions idempotent and auditable. |
| FR-UPI-08 | P0 | Wrong amount, late credit, ambiguous UTR, duplicate claim and unconfirmed transfer have distinct resolution paths. |
| FR-UPI-09 | P0 | Intro ₹19 applies to first 50 eligible, unique verified buyers (best-effort manual eligibility) and does not consume capacity on submission alone. |
| FR-UPI-10 | P0 | If intro is unavailable at purchase, show a new agreed amount before paying; no silent repricing. |
| FR-UPI-11 | P0 | Production queue excludes unverified, rejected or unresolved payment claims. |
| FR-UPI-12 | P0 | Manual refund status requires verified returned transfer; merely requesting refund does not count. |
| FR-UPI-13 | P0 | Current UPI merchant details, WhatsApp number and policy copy are configuration, not hardcoded secrets or sample placeholders. |

### 4.4 Guest tracking and downloads

| ID | P | Acceptance rule |
|---|---|---|
| FR-TRK-01 | P0 | Each order gets unguessable revocable guest access capability; only token hash stored. |
| FR-TRK-02 | P0 | Buyer sees payment verification, production, QC and per-slot status; no internal bank or admin secrets. |
| FR-TRK-03 | P0 | Expired/invalid/wrong order access yields neutral failure and safe support recovery. |
| FR-TRK-04 | P0 | Status is authoritative server response, never optimistic browser-only success. |
| FR-DLV-01 | P0 | Full quality eligibility = VERIFIED payment + APPROVED slot + valid order access + ACTIVE entitlement. |
| FR-DLV-02 | P0 | Candidate upload, UTR submission or screenshot never authorizes downloading. |
| FR-DLV-03 | P0 | Three/five-photo packages unlock only individually approved slots. |
| FR-DLV-04 | P0 | Access uses protected Cloudinary type and narrowly short-lived authorization; permanent public original URLs prohibited. |
| FR-DLV-05 | P0 | New downloads after a lawful entitlement revocation are denied; asset grants logged without secrets. |
| FR-DLV-06 | P0 | Approved original delivered without a watermark; safe retry if delivery fails. |

### 4.5 `/admin` and manual production

| ID | P | Acceptance rule |
|---|---|---|
| FR-ADM-01 | P0 | `/admin` unauthenticated shows password-only form; no username, admin registration, or additional admin roles. |
| FR-ADM-02 | P0 | Server securely verifies one configured password hash; password never shipped to JS/client. |
| FR-ADM-03 | P0 | Short-lived/rotatable server session cookie; logout and expiry revoke access to all admin routes. |
| FR-ADM-04 | P0 | Throttle failed login attempts, reject CSRF/forged state-changing requests, no password/token logging. |
| FR-ADM-05 | P0 | Admin payments inbox lists unverified UTR submissions and optional private proof, without auto-verification. |
| FR-ADM-06 | P0 | Admin verification requires explicit independent bank-credit check and logs evidence/actor/when. |
| FR-ADM-07 | P0 | Admin may reject, flag duplicate or request clarification without unlocking production. |
| FR-ADM-08 | P0 | Verified production queue shows only eligible orders, contact, style, quantity and due status. |
| FR-ADM-09 | P0 | Admin securely accesses source/reference, records generation attempts and stores restricted candidate per slot. |
| FR-ADM-10 | P0 | Admin can reject with reason or approve a reviewed candidate, independently for each purchased slot. |
| FR-ADM-11 | P0 | No API action can approve slots on unverified payment or grant downloads by changing aggregate status alone. |
| FR-ADM-12 | P0 | Admin can record case, support note, correction, manual refund verification and delivery issues. |
| FR-ADM-13 | P1 | More admins, role management, audit export and automation are deferred. |

### 4.6 WhatsApp, Groq, privacy and analytics

| ID | P | Acceptance rule |
|---|---|---|
| FR-HELP-01 | P0 | Prominent WhatsApp help CTA opens configured support conversation with **public** order code only. |
| FR-HELP-02 | P0 | Payment pending, mismatch, late delivery and access loss screens expose support route and business response hours. |
| FR-WISH-01 | P0 | Birthday wish available anonymously, without payment or photo upload. |
| FR-WISH-02 | P0 | Validate name, tone, relation, language and length on frontend/backend. |
| FR-WISH-03 | P0 | Groq calls use server credentials; handle rate limits, timeouts and safe errors. |
| FR-WISH-04 | P0 | Generated wish can be copied/shared and screen-reader status announced. |
| FR-WISH-05 | P0 | Rate limits and basic anonymized usage metrics prevent free-tool abuse. |
| FR-SEC-01 | P0 | Cloudinary public gallery separated from authenticated uploads/candidates/finals/proofs. |
| FR-SEC-02 | P0 | Record versioned processing consent, audit events and retention/deletion completion. |
| FR-SEC-03 | P0 | No customer link, password, UTR, IP or face image content placed into general analytics events. |
| FR-SEC-04 | P0 | Consent, order and customer image access remain scoped to their owner and authorized single admin. |
| FR-SEC-05 | P0 | Every approval, verification and refund decision has an auditable reason/time/actor. |

## 5. State Machines

### 5.1 Payment verification (independent from order production)

| Status | Meaning | Legal next statuses |
|---|---|---|
| NOT_SUBMITTED | Order awaits UPI action / UTR claim | CLAIM_PENDING_REVIEW / EXPIRED |
| CLAIM_PENDING_REVIEW | UTR entered; credit **not** confirmed | VERIFIED / NEEDS_INFO / REJECTED / DUPLICATE_FLAGGED |
| NEEDS_INFO | Ambiguous/wrong amount/needs more proof | CLAIM_PENDING_REVIEW / VERIFIED / REJECTED / REFUND_PENDING |
| DUPLICATE_FLAGGED | Reused/ambiguous credit claim | NEEDS_INFO / REJECTED, or VERIFIED only after independent unique credit resolution |
| REJECTED | Claim not valid; no entitlement | CLAIM_PENDING_REVIEW (new attempt) / CLOSED |
| VERIFIED | Admin matched actual credit | REFUND_PENDING / REFUNDED (according to policy) |
| REFUND_PENDING | Return transfer being arranged/verified | VERIFIED if cancelled/failed / REFUNDED on confirmed settlement |
| REFUNDED | Actual return transaction confirmed | CLOSED; new charge requires a new attempt |
| EXPIRED | No timely claim/verification; manual late-credit resolution available | CLAIM_PENDING_REVIEW when revived by authorized workflow / CLOSED |

**Rules:** Customer can't call the VERIFIED transition; a new UTR claim is not proof of credit; verification requires an independent receiving-account transaction, matching receiver+amount+reference, recorded reviewer confirmation, and unique matching. Finance logs are append-only after verification. No payment gateway callbacks exist in MVP.

### 5.2 Production state

| Status | Entry condition | Display |
|---|---|---|
| DRAFT | Order not ready for UPI | Complete order |
| PAYMENT_UNVERIFIED | Waiting UPI claim/review | Awaiting payment confirmation |
| QUEUED | Payment VERIFIED; all required data valid | Preparing your photo |
| IN_PROGRESS | Manual generation started | In progress |
| QC_PENDING | Candidate uploaded, unapproved | Quality review |
| PARTIALLY_READY | At least 1 but fewer than all slots approved | X of Y photos ready |
| READY | Every purchased slot approved | Download ready |
| REVISION_REQUIRED | One or more slot candidates rejected | Refining the result |
| COMPLETED | Approved contracted outputs made available | Completed |
| CLOSED | Resolved cancellation/refund/exception | Closed |

### 5.3 Per-slot state

`WAITING → GENERATING → CANDIDATE_UPLOADED → (REJECTED → GENERATING)* OR APPROVED → DELIVERABLE`.  
Approval always points to a specific immutable candidate ID. Replacing a candidate cannot inherit approval by accident.

### 5.4 Admin auth state

`LOGGED_OUT → PASSWORD_SUBMITTED → AUTHENTICATED → EXPIRED/LOGGED_OUT`. Incorrect passwords never create sessions. API authorization is not decided by URL or browser-only state.

## 6. Exceptions, Recovery and UI Messages

| Event | Required customer/admin behavior |
|---|---|
| App claims payment success but no credited transfer | Show still unverified, allow UTR resubmission/help; admin cannot approve |
| QR cannot scan / same-phone payment | Show Pay in UPI App, copy UPI ID and amount with explicit confirmation text |
| Incorrect payment amount | Hold claim, show “Amount needs review”, direct to WhatsApp; admin documents top-up/refund path |
| UTR claimed twice | Flag conflict, no second verification; safe neutral message and admin investigation |
| Payment screenshot fabricated | Reject proof; store minimum anti-abuse evidence, never process portraits |
| Connection lost after UTR claim submit | Deduplicate by idempotency key; safe state refresh, no duplicate orders |
| Intro 50 slots used | Offer regular plan; preserve already-agreed amount if valid reservation policy dictates |
| Admin wrong password repeatedly | Delay or rate-limit login; never leak stored hash or credential hints |
| Admin session expired mid-edit | No silent save; return to login and safely retry state-changing action |
| Cloudinary upload unavailable | Keep candidate/photo state unchanged; actionable retry |
| Candidate rejected for poor likeness | Restricted candidate, logged reason, regenerate manually |
| Partial multi-image fulfillment | Download only approved slots; pending slots show progress |
| Invalid/expired guest order link | Neutral invalid-link screen + safe WhatsApp recovery |
| Customer asks for refund | Case logged; manual transfer and independent settlement checked before status changes |
| Groq provider unavailable | Friendly retry/later message, no secrets/raw error |

## 7. Non-Functional Requirements

| ID | Category | Launch quality bar |
|---|---|---|
| NFR-SEC-01 | Protected originals | Zero confirmed access to private source/candidate/final/proof via public URLs or unapproved download paths |
| NFR-SEC-02 | Admin | Argon2id or equivalent slow salted hash, HTTPS, HttpOnly Secure SameSite sessions, CSRF protection, throttled login |
| NFR-SEC-03 | UPI | 100% independently verified order credits; no screenshot-based success; one credit cannot fund two orders |
| NFR-REL-01 | Reliability | Idempotent claim submissions, admin verifies and approves; consistent server state after retries |
| NFR-REL-02 | Recoverability | Database backup/restore tested; orphans and expired photo media cleanup |
| NFR-PERF-01 | Frontend | Responsive at 320–1440+ px; optimize image loading; measure Core Web Vitals |
| NFR-ACCESS-01 | Accessibility | Keyboard navigable, visible focus, meaningful labels/error text, high contrast, reduced motion supported |
| NFR-PRIV-01 | Privacy | Explicit third-party photo-processing consent, minimized metadata, data retention and deletion workflow |
| NFR-PRIV-02 | Logging | Never log plaintext admin password, secret guest link, source photos, Groq key or raw bank details |
| NFR-OPS-01 | Manual operating capacity | Dashboard surfaces queues, age, manual payment verification time and at-risk deadlines |
| NFR-QUAL-01 | Photorealism | QC checks for likeness, skin, light, body anatomy, reference styling and artifacts per image |
| NFR-WISH-01 | Free wishes | Backend limits by rate, provider error/timeout recoverability and stable copy/share |

Numeric performance budgets and exact lifetimes belong to the design proposal and require validation on target devices and deployment. Do not promise instant verification or delivery.

## 8. Measurement and QC

**Realism checklist per approved candidate:** Face recognizable (eyes, nose, mouth and proportions); realistic skin texture; believable lighting/shadows; natural hair, fingers and clothing; reference-inspired pose/environment; no extra limbs/obvious AI defects; allowed content and informed consent.

| Metric | Formula / reporting instruction |
|---|---|
| Verified customers | Distinct eligible non-test contacts with independently verified UPI credit, not fully refunded; note identity uncertainty |
| Conversion | Unique verified buyers / unique qualified offer visitors; exclude test traffic |
| Payment review time | Admin verified/rejected timestamp minus first pending UTR submission |
| Claim rejection/ambiguity rate | Rejected+flagged claims / total reviewed claims |
| Final image pass within 3 | Approved outputs after <=3 attempts / all approved outputs; report total and exceptions |
| Fulfillment time | First verified credit → last promised slot downloadable |
| On-time delivery | Verified paid orders completed within published SLA / eligible verified orders |
| Satisfaction | Respondents rating both realism and likeness >=4/5 / respondents |
| Refund-request rate | Completed orders with support refund requests / completed orders in defined cohort |
| Contribution/order | Verified revenue - external/storage costs - attributable human time - refunds/other variables |
| Security bypasses | Number of confirmed unauthorized original accesses; release goal 0 |
| Birthday success | Successful Groq responses / valid rate-limit-eligible requests |

## 9. End-to-End Acceptance Test Scenarios

| ID | Given / When / Then |
|---|---|
| AT-01 | Given published style and valid selfie, when consent granted and package chosen, then persisted draft contains same style and price snapshot. |
| AT-02 | Given no consent, when proceeding to payment, then order payment step is blocked. |
| AT-03 | Given ₹49 standard plan, when checkout opens, then QR and deep-link show correct merchant details and amount. |
| AT-04 | Given user submits UTR and screenshot, when tracking opens, then state remains PAYMENT_UNVERIFIED; no production/download. |
| AT-05 | Given matching real credited transfer independently checked by admin, when verified, then exactly one order enters paid queue and audit logs independent observation. |
| AT-06 | Given fake screenshot without real transfer, when admin reviews, then claim rejected; no paid work or download. |
| AT-07 | Given second order claims already-verified UTR, when admin attempts verification, then duplicate prevented and investigated. |
| AT-08 | Given mismatch between expected and received amount, when admin reviews, then clarification required; no automatic entitlement. |
| AT-09 | Given admin enters correct password at `/admin`, when backend validates, then secure session permits dashboard and not public signup. |
| AT-10 | Given incorrect password or expired admin session, when requesting admin API, then access denied and no private order data leaks. |
| AT-11 | Given candidate uploaded for VERIFIED order without approval, when buyer requests download, then denial and no original URL. |
| AT-12 | Given verified order + approved slot + valid guest token, when buyer downloads, then original is served via expiring authorized mechanism. |
| AT-13 | Given 3-image order with one approved slot, when buyer opens tracking, then only one slot downloads; other two stay protected. |
| AT-14 | Given buyer A token and buyer B slot ID, when A downloads B slot, then denied without leaking any B image bytes. |
| AT-15 | Given rejected candidate and replacement, when approving replacement, then old candidate remains unapproved and all decisions auditable. |
| AT-16 | Given expired guest token, when opening tracking, then no order leak, WhatsApp recovery path available. |
| AT-17 | Given verified refund settlement and revoked entitlement, when new download requested, then denied as policy dictates. |
| AT-18 | Given valid name in free birthday tool, when Groq replies, then generated wish displays and Copy works. |
| AT-19 | Given Groq rate limit or outage, when sending request, then safe error and no exposed credential. |
| AT-20 | Given introductory capacity is exhausted, when new buyer chooses ₹19, then explicit repricing is required before UPI payment. |
| AT-21 | Given QR screen opened on phone, when UPI deep-link fails, then copy VPA/amount fallback remains usable. |
| AT-22 | Given simultaneous admin payment verification clicks, when processed, then one verified credit/entitlement and one idempotent audit outcome result. |
| AT-23 | Given private Cloudinary public/derived URL guessed, when accessed without signed authorization, then storage denies it. |
| AT-24 | Given approved photo but unverified payment, when a forged approval/download call occurs, then server blocks. |

## 10. Role-Based Operational Checklists

**Buyer:** Browse → style → selfie → consent → package → inspect payee/amount → pay UPI → enter UTR → WAIT pending admin review → secure link tracking → approved image(s) → secure download → support if necessary.

**Single admin:** Enter `/admin` password → payment inbox → compare real incoming credits → independently verify or reject → production queue → retrieve private source + reference → manual ChatGPT → QC candidates → approve each image → manage support/refund → delete local files per retention.

**Free visitor:** Birthday generator → enter name/preferences → Groq response → copy/share → optional photo gallery.

## 11. Open Business Decisions Requiring Sign-Off

| Ref | Decision | Interim treatment |
|---|---|---|
| DEC-01 | Public turnaround and support/verification hours | Do not publish unsupported “instant” promise |
| DEC-02 | Actual merchant VPA / display name / QR and WhatsApp support number | Deployment configuration; no placeholder shown live |
| DEC-03 | Included corrections, likeness threshold, refund criteria and transfer time | Publish before collecting money |
| DEC-04 | Private guest link expiry and recovery identity checks | Secure default proposed in Document 03, owner approval required |
| DEC-05 | Local/source/final/proof retention days | Policy-dependent; implement expiration hooks |
| DEC-06 | ₹19 first-50 identity rules and race/abandoned-order treatment | Best-effort customer identity, manual reconciliation |
| DEC-07 | Incorrect amount, late credit, unclaimed transfer and overpayment handling | Human review / written resolution policy |
| DEC-08 | Accepted photo file/dimension/size and UTR validation limits | To test against actual traffic and receiving bank format |
| DEC-09 | Product public name | AI Photo Studio is the working subproduct name |

## 12. Traceability and Release Gate

| PRD v1.1 requirement | FRD evidence | Technical design owner |
|---|---|---|
| Manual UPI QR & independent credit verification | WF-03–05; FR-UPI; AT-03–08/22 | API + Neon claims/review transaction + UPI UI |
| Single password `/admin` | WF-12; FR-ADM-01–04; AT-09/10 | Bun auth + session storage + login screen |
| Consent, photorealism, manual generation | WF-02/07/08; FR-UPL/ADM; AT-01/11/15 | Private Cloudinary + QC workstation + admin UI |
| Approval-gated originals | WF-09; FR-DLV; AT-11–14/23/24 | Download authorization service |
| 50-customer launch and packages | FR-UPI-01/09/10; AT-20 | Pricing snapshots / promotion slots |
| Free birthday wishes | WF-11; FR-WISH; AT-18/19 | Groq endpoint + wish page |
| WhatsApp support | FR-HELP | UI support CTA; no messaging provider |

**Do not release if** a UTR alone activates production, an unapproved original is publicly obtainable, unauthenticated `/admin` APIs expose private data, refunds pretend to be automated, or customer image processing proceeds without consent. All open customer-facing commercial policies must be written and approved before first payment.

---

**Document status:** FRD v1.1 fully replaces gateway-provider and webhook assumptions in FRD v1.0 with direct UPI plus manual bank reconciliation. Other product requirements remain as defined in PRD v1.1.
