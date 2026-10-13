# QuickWish — AI Photo Studio
## Product Requirements Document (PRD) v1.1

**Document:** 01 of 03 · **Status:** Revised draft for product sign-off  
**Date:** 12 October 2026 · **Parent brand:** QuickWish  
**Product:** AI Photo Studio (working name) + Free Birthday Wish Generator  
**Supersedes:** PRD v1.0; business vision, audiences, quality bar, offers, and manual generation remain unchanged.

---

## 0. Change Control — What Changed and What Did Not

| Ref | v1.0 | v1.1 binding decision | Reason |
|---|---|---|---|
| CHG-01 | Indian payment gateway + automatic capture confirmation | **Direct UPI QR / UPI payment link, followed by independent MANUAL admin receipt verification**; no payment gateway | Lower integration cost for initial pilot |
| CHG-02 | Generic secure admin authentication | **One admin password at `/admin`**, no username, registration, or multi-admin roles; secure server session required | Simplify founder-operated production |
| CHG-03 | Generic transactional PostgreSQL | **Neon DB PostgreSQL** | Confirmed managed database |
| CHG-04 | Support path unspecified | **Visible WhatsApp assistance CTA**, with general order-help contact | Faster human support |
| UNCHANGED | Everything else | QuickWish umbrella; photorealism, user consent, public gallery, customer upload, manual ChatGPT, QC, per-image approval, secure download, free Groq wishes, and ₹19/₹49/₹99/₹149 pricing | Preserve approved product hypothesis |

**Authoritative distinction:** A UTR, screenshot, payment-app success screen, or customer declaration is a **claim**, never payment confirmation. Admin approval of payment requires an independently observed credit in the actual receiving UPI/bank account. The photo release guard is **PAYMENT_VERIFIED + IMAGE_APPROVED + CUSTOMER_AUTHORIZED**.

## 1. Executive Summary

QuickWish offers two coordinated experiences. **AI Photo Studio** is a paid, human-curated service converting a customer's permitted selfie into realistic, reference-inspired photography. **Birthday Wishes** is a separate free Groq-powered generator for personalized text greetings.

A visitor explores original or licensed styles, selects one, uploads a photograph, consents to processing, chooses a package, and views a QR code or UPI-app link displaying the exact payable amount. The visitor completes payment outside the website, enters a transaction reference (UTR) and optionally a screenshot, and receives **Payment verification pending**. The admin signs into `/admin` with the single configured password, checks the actual payment credit independently, then marks the order **payment verified**. Only then does production begin. The admin manually generates photographs through ChatGPT, reviews likeness/realism, uploads private candidates, and explicitly approves each deliverable. The buyer's approved original can be downloaded only through backend authorization.

The MVP intentionally has **no gateway and no automated ChatGPT generation**. It validates demand with real purchases while the admin manually verifies every payment and fulfillment outcome.

## 2. Vision, Positioning and Principles

**Vision:** Make believable, premium-looking, personalized photography available to people with only a normal selfie, without requiring physical shoots, specialist editing, or prompt engineering.

**Positioning:** *Your face. Your style. A realistic AI photoshoot.* Clearly identify results as AI-created; do not represent them as camera-captured or promise perfect likeness.

**Principles:** realism before volume; face identity before dramatic effects; customer simplicity; manual QC; transparent price, delivery, revision and refund policies; privacy by design; explicit approval before download; measure human operating cost; do not over-automate the pilot.

## 3. Customer Problems and Opportunity

- **Portrait customer:** Wants cinematic, professional, fashion, festive or lifestyle photographs without physical photoshoot expenses. Free tools can require trial-and-error prompts and yield face mismatch or artificial skin/anatomy.
- **Trust issue:** Customers pay before receiving a bespoke result, so published before/after examples, reliable order status, responsive support and fair remedies are essential.
- **Operational issue:** Manual UPI payment introduces ambiguity and fraud risk; payment verification is intentionally human-driven, with a queue and complete audit trail.
- **Birthday visitor:** Wants a personalized birthday greeting instantly, without registration or payment.

**Opportunity hypothesis:** Some Indian adults will pay for a curated, realistic result and convenient done-for-you workflow. Existing competitors do not prove willingness to buy from QuickWish.

## 4. Customers, Jobs and User Roles

| Role | Job to be done | Access model |
|---|---|---|
| Public visitor | Browse credible styles, compare packages | Public pages |
| Photo buyer (adult, pilot) | Order a personal photorealistic portrait; pay via UPI; track; download approved output | Secret order-access link; no account required |
| Birthday wish visitor | Generate, copy and share a greeting | Public, no login/payment |
| Single studio administrator | Independently verify UPI receipts; manually create, review, approve, deliver, and resolve orders | Password-only `/admin` login + secure server session |

Identity ownership and image-submission permission are required. The initial pilot should serve adults unless a reviewed minors/guardian-consent workflow is introduced.

## 5. Core Value Proposition

**Select a style → Upload your selfie → Pay by UPI → Let our studio review the result → Download your approved photograph.**

We sell the final manually reviewed photograph, not a raw generation, a ChatGPT subscription, or an automatic portrait tool. The customer shouldn't write prompts or understand AI software.

## 6. Hypotheses to Validate

| ID | Unproven hypothesis | Validation evidence |
|---|---|---|
| A-01 | Customers pay for recognizable, convincing portraits | Unique independently verified paid buyers; conversion |
| A-02 | Manual generation achieves sufficient realism/likeness | QC approval rate within three attempts; customer feedback |
| A-03 | People will trust QR + manual verification | Payment-claim-to-verified conversion; abandonment and support contacts |
| A-04 | Admin can verify receipts and fulfill within a reasonable window | Median/p90 claim verification and fulfillment time |
| A-05 | ₹19 introductory offer recruits buyers; ₹49 sustainable after pilot | Paid conversion and contribution/order by package |
| A-06 | Free wishes build traffic and create optional paid discovery | Eligible wish requests, successful completions, tracked gallery visits |
| A-07 | Consent and gated delivery protect customer images | Privacy/security test results; no unauthorized originals |
| A-08 | One-password founder-operated admin is manageable in pilot | Authentication abuse, admin access and support metrics |

## 7. Measurable Success Criteria (Pilot, Not Market Benchmarks)

| Outcome | Measurement | Proposed target |
|---|---|---|
| Paying demand | Unique non-test buyers with independently verified UPI credit, not fully refunded | First **50** buyers, 30-day exploratory window |
| Paid conversion | Unique verified buyers / unique qualified photo-offer sessions (>=200 sessions; exclude test/admin) | **≥5%** pilot indicator |
| Likeness and realism | Final images passing documented QC within <=3 generation attempts | **≥80%** |
| Customer satisfaction | Survey respondents rating both likeness and realism >=4/5 | **≥80%** among respondents; sample size shown |
| Payment discipline | Every order processed only after actual credit check and recorded reviewer evidence | **100%** paid orders |
| Delivery reliability | Verified paid orders fulfilled within public promise | **≥90%** after real baseline tests |
| Quality/remedy risk | Completed orders with refund request in a defined 14-day cohort | **≤10%** exploratory threshold |
| Security | Confirmed unauthorized access to source or unapproved full-quality final | **0**, release-blocker |
| Auditability | Verified orders with claim, verification, QC, image and entitlement records | **100%** |
| Economics | Revenue minus payment-related costs, attributable AI/storage costs, production time, support and refunds | Measure every order; target positive contribution at ₹49 before scale |
| Free generator | Successful Groq responses / valid rate-limit-eligible requests | **≥95%** during pilot |

**Do not** count submitted UTRs, screenshots or unverified claims as revenue or paying customers. Report verified transaction totals and manual reconciliation time separately. Report satisfaction/quality sample sizes; stop scaling if security tests fail.

## 8. MVP Scope

### 8.1 P0 — Paid Photo Studio

- Premium mobile-first homepage, public original/licensed reference gallery, style details, truthful samples and AI disclosure.
- Style selection; permitted selfie upload, validation and explicit third-party AI processing consent.
- Four configurable packages; server-side price snapshot and payable UPI amount; scannable QR **and mobile UPI deep-link**, with copyable merchant UPI ID as fallback.
- UTR submission and optional screenshot proof; clear **Awaiting manual verification** messaging and WhatsApp assistance.
- Back-office reconciliation against incoming bank/UPI credits. Admin can verify, reject, request more details, or mark duplicate/ambiguous claims for investigation; no automatic payment success.
- Guest customer order tracking via revocable secret link, protected personal media and private source/final images.
- Single-password `/admin` entry; one admin session; paid queue; source/reference retrieval for manual ChatGPT production; candidate upload; realism QC; individual deliverable approval; secure download; exceptions and manual refunds.
- Basic analytics: visits, UTR claims, verified orders, QC attempts, fulfillment, support/refunds and birthday usage.

### 8.2 P0 — Free Birthday Wish Generator

Public birthday message creation via Groq, using name (required), optional relationship/tone/language, rate limits, copy/share controls and safe errors. The free feature is independent from photo purchase.

### 8.3 P0 — Trust and Operations

Protected Cloudinary originals, consent records, admin login throttling/session protection, signed/short-lived authorized downloads, server-side entitlements, audit logs, transparent delivery/correction/refund policy and deletion of unnecessary photos/local admin copies.

### 8.4 P1 (Later)

Customer accounts and history; automated WhatsApp messaging; customer-facing low-res preview before approval; automated UPI reconciliation or payment gateway; auto image generation API; referrals, print, credits, bulk operations, advanced analytics and additional admin roles.

### 8.5 Explicitly Excluded

Gateway SDK/checkout/webhooks; direct access to ChatGPT Plus for website visitors; automated ChatGPT browser access; subscriptions, physical prints, real-camera service; guaranteeing perfect likeness; public customer asset URLs; multiple admin passwords or RBAC for pilot.

## 9. High-Level Journeys

**Buyer:** Home → Gallery → Style → Upload/consent → Package → UPI QR/app payment → Submit UTR → Pending verification → Verified → Studio manual production → QC and per-slot approval → Secure order link → Download approved photograph → Optional support.

**Admin:** `/admin` → Password-only login → Pending UPI claims → Independently inspect receiving bank/UPI transaction → Verify or reject claim → Paid queue → Retrieve customer photo and style → Manually generate in ChatGPT → Upload candidate → QC → Approve each image → Fulfillment and issue handling.

**Free visitor:** Birthday wishes → Name + optional tone/relationship/language → Groq generation → Copy/share → Optional photo gallery discovery.

**Pre-approval:** No full-quality download even if a file exists in storage. User-visible pending verification must never be labeled “Paid.”

## 10. Pricing and Commercial Policy

| Offer | Price | Deliverables | Rule |
|---|---|---|---|
| First-time introduction | ₹19 | 1 approved photo | First 50 eligible **verified** paying customers; once per customer, fair manual adjudication |
| Standard | ₹49 | 1 approved photo | Regular-price test |
| Popular | ₹99 | 3 approved photos | Three approved slots, not three generation attempts |
| Premium | ₹149 | 5 approved photos | Five approved slots |
| Birthday wishes | Free | Text wish | Anonymous, rate-limited |

Pricing amounts are **experimental**, not guaranteed sustainable. The website must not claim instant verification; a separate payment claim and admin review occur before order production. Shipping/turnaround, failed/ambiguous payments, delivery failure remedies, revision quota, retention and refunds require a published policy before launch.

**Promotion caveat:** Without verified individual accounts, the first-50-unique-customers rule is best-effort. Record a consistent buyer contact identifier and handle suspected duplicates manually; don't assert cryptographic uniqueness from a phone number or UTR alone.

## 11. Locked Stack and Dependencies

| Concern | Decision |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS; Vite recommended |
| Backend | Bun + TypeScript (required for security, UTR verification records, uploads, Groq proxy and protected downloads) |
| Database | **Neon DB PostgreSQL** — authoritative order, claim, QC, auth/session, audit data |
| Images | Cloudinary with separate public reference and restricted customer/original assets |
| Payment | Direct UPI merchant QR and UPI app link; **manual bank-account confirmation**, no gateway |
| Support | WhatsApp help CTA using an admin-configured support number; never claim automated WhatsApp notifications |
| Birthday AI | Groq via server-only API key |
| Paid photo AI | Manual ChatGPT usage subject to current terms, limits and disclosed third-party processing |
| Admin | One password at `/admin`; password hash/server sessions; no username or self-registration |

## 12. Primary Risks and Product Mitigations

| Risk | MVP mitigation |
|---|---|
| Fake receipt / reused UTR / wrong amount | Treat all customer proofs as unverified claims; match independently against bank/UPI credit, amount and reference before marking verified; preserve audit |
| Misleading “instant payment” expectation | Show verification pending, support WhatsApp and accurate review hours/time |
| Password-only admin brute forcing | Strong high-entropy password, salted slow hash, login throttle, HTTPS, secure cookies, server-side API guards |
| Private photo leaks | Restricted Cloudinary delivery, separate public gallery, time-limited access and secure link authorization |
| Wrong face or artificial output | Manual realism checklist, bounded retries, human review, written correction/refund policy |
| Underpriced manual fulfillment | Record admin verification and generation minutes/order, refunds and margins |
| Access lost with guest order link | Offer safe recovery through independently verified support without displaying other orders |
| Birthday Groq abuse | Server-side limits, prompt/input constraints, errors without secrets |
| Local image copies retained | Secure temporary workspace and documented purge period |

## 13. Launch Gates and Open Decisions

**Release gates:** Test successful and false UPI proof claims; prevent double verification; never process claims that aren't independently matched; verify wrong-order and unapproved download denial; confirm `/admin` API cannot be reached without session; consent and deletion measures; end-to-end test one- and five-image orders; provide WhatsApp support and truthful published policies; no Groq key exposure.

**Still requires business sign-off:** Published payment-verification hours, delivery ETA, admin-specific UPI VPA and display name, supported payment apps/fallback, retry window for late credits, UTR format validation, refundable scenarios and refund settlement steps, revision allowance, secure-link validity/recovery, photo retention period, intro-offer duplicate resolution, actual support WhatsApp number, photography brand name, and supported upload limits. Document 03 may propose implementation defaults, not silently fix these policy values.

---

**Document status:** PRD v1.1 preserves product and pricing; changes payment mechanics to manually verified UPI, simplifies `/admin` to one password, confirms Neon PostgreSQL and WhatsApp support. FRD v1.1 supersedes provider-webhook-specific behavior; Technical + Visual Design v1.0 implements this revised baseline.
