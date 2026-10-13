# Verification report

Build date: 12 October 2026. Evidence records actual commands, not claimed launch certification.

## Local verification

| Check | Outcome | Evidence / limit |
|---|---|---|
| Dependency installation + lockfile | PASS | Bun 1.4.3; frozen install accepted; node_modules excluded from ZIP |
| TypeScript | PASS | `bun run typecheck` |
| Production frontend build | PASS | `bun run build` (Vite); React app and bundled font/assets compiled |
| Policy / PostgreSQL integrity tests | PASS | 25 tests, 132 assertions; migration executed by PGlite |
| Manual workflow API integration | PASS | Real Bun API + ephemeral PGlite socket; 1 workflow test, 23 assertions |
| Migration runner locally | PASS | Applied `0001_initial.sql` using the migration runner against a temporary PGlite socket |
| Neon migration | BLOCKED | DNS `EAI_AGAIN`; no migration confirmed on the supplied Neon instance |
| Docker PostgreSQL demo startup | NOT RUN | Docker/PostgreSQL binaries unavailable; scripts supplied |
| Playwright / visual QA | NOT RUN | Browser binaries were not downloaded; user requested lightweight work |
| Real UPI credit / refund | NOT RUN | Merchant VPA and bank review evidence not provided |
| VPS / HTTPS / backup restore / load | NOT RUN | Outside this local ZIP build and lightweight verification scope |

Local API workflow: password login; unauthenticated admin denial; missing-Origin mutation denial; no-consent order denial; valid three-photo order; private source upload; claim stays unverified; unknown buyer denied; wrong amount rejected; demo ledger reconciliation; repeated verification is idempotent; private candidate upload; pre-QC download denied; seven-check explicit approval; approved slot downloads; pending slot denied; stranger denied; revoked entitlement denied. This is API-level end-to-end, not browser/payment-app end-to-end.

Test development found JSON/date parameter serialization issues in the embedded protocol path; serialization is now explicit. Final checks run after the correction. PGlite's multi-client lifecycle differs from PostgreSQL; the final harness initializes schema directly and uses one API database pool. It does not establish Neon concurrency properties.

## Live requests using supplied server credentials

| Service | Outcome | Actual evidence |
|---|---|---|
| Neon PostgreSQL | BLOCKED | Host DNS resolution failed with `EAI_AGAIN`; migrations/seed on Neon remain unverified |
| Groq | PASS | Accessible models queried (HTTP 200); `openai/gpt-oss-20b` returned a nonempty birthday completion (HTTP 200) |
| Original Groq model | FAILED, corrected | `llama-3.3-70b-versatile` returned HTTP 404 `model_not_found`; account-listed model now configured |
| Cloudinary credentials | PASS | Authenticated Admin API ping succeeded |
| Cloudinary private upload | PASS | Generated 256×256 solid-color fixture uploaded as `authenticated` |
| Cloudinary private delivery | PASS | Server-only expiring signed download returned image bytes |
| Cloudinary unsigned original | PASS | HTTP 401, no image released |
| Cloudinary unsigned transformation | PASS | HTTP 401, no image released |
| Cloudinary final fixture deletion | PASS ON RESUME | Inventory returned the earlier 256×256 asset. Its timestamp and downloaded uniform green pixels confirmed it was the generated verification fixture; provider confirmed deletion. |

Cloudinary requests intermittently timed out (HTTP 499/TimeoutError). Upload timeout was increased to 45 seconds; the later protected round trip passed. The previously retained fixture was identified and deleted on resume. Inventory contained only that one asset under the test prefix. Future `verify:live` runs retain a returned fixture identifier privately for `bun run verify:cleanup`; upload timeouts can still require account inspection.

Sanitized final provider results are in `live-verification.json`. No secret values or signed media URLs are included. Real keys were used only in backend `.env`, excluded from the archive and browser build. A secret scan and ZIP integrity check are performed before delivery.

## Remaining setup, not fabricated success

Configure merchant VPA/name, support WhatsApp, an admin password, approved policies/retention and HTTPS deployment. Re-run `bun run db:migrate`, `bun run db:seed`, `bun run verify:live`, then `bun run doctor` on your normal network. Replace illustrated sample styles with owned/licensed portrait examples. Review the reservation/retention tradeoffs and outstanding checks in implementation-decisions.md before accepting customer money.

## Resume and final packaging

- Existing 55-file ZIP and all source files were preserved; implementation was not restarted.
- Neon DNS was retried and again failed with `EAI_AGAIN` (-3). No live migration or seed is claimed.
- Cloudinary inventory and authenticated download identified the retained generated fixture; deletion was confirmed by the provider. No customer images were deleted.
- Temporary Bun installation from the earlier run was no longer present. Dependencies were not reinstalled and passing build/tests were not repeated; the source implementation is unchanged.
- Added exact PowerShell extraction, demo startup and live-verification commands to README.
- Backend credentials and temporary cleanup metadata were removed after verification. The source ZIP includes placeholders only.
- ZIP CRC integrity, required component inventory, dependency lockfile, migration/setup scripts and secret scans passed.
