# VPS deployment

1. Create a dedicated non-root `quickwish` account and install Bun 1.4.3. Copy source to `/opt/quickwish`; use `bun install --frozen-lockfile` and `bun run build`.
2. Configure `apps/api/.env` locally on the VPS (mode 600, owned by the application user). Set LIVE, NODE_ENV=production, HTTPS canonical URL, verified merchant/support settings, owner-approved policies and API credentials. Generate password using `bun run admin:password`.
3. Use a least-privilege PostgreSQL role for runtime, with `quickwish` schema access. A separate migration role can be supplied in `DATABASE_DIRECT_URL`. Do not grant application users DDL or trigger-disable powers. Keep TLS verification enabled.
4. Run `bun run db:migrate`, `bun run db:seed`, `bun run verify:live`, and `bun run doctor`. The migration runner never removes unrelated schemas. Back up first before upgrading a nonempty existing database.
5. Adapt `infra/quickwish.service` to your installed Bun path. Bun serves built frontend and API on loopback port 3001. Caddy owns public HTTPS. Replace the example hostname in `infra/Caddyfile` and validate it before reloading Caddy.
6. Publish only licensed/owned representative reference photography. Configure review hours and delivery/refund/correction text before accepting money. Run the real UPI workflow with a small known transfer, independently verify the receiving account, and confirm settlement/denial paths.
7. Monitor `/healthz`, `/readyz`, safe request failure counts, provider failures, pending payment age, support requests and QC queues. Never capture raw request bodies, password/UTR/session/link data in proxy logs. URL fragments never reach servers, but avoid application analytics on private screens.
8. Run `bun run media:cleanup` daily under the same protected environment **after retention approval**. It handles up to 100 expired known assets per run; schedule enough runs for actual volume. Investigate failed deletions and provider orphans separately. Remove temporary admin working copies too.
9. Configure Neon backups/PITR for your plan and test restoring into a separate database. Validate payment-reference uniqueness, restricted media access and reconciliation after restore. Retention across backups needs a separate policy.
10. Rotate keys/password periodically and after exposure. Never put backend secrets into a `VITE_` variable. Password hash rotation invalidates old admin sessions. Coordinate Cloudinary key rotations with signed-download compatibility.

## Release checks not replaced by unit tests

- Independent real bank credit review and a confirmed manual refund.
- Wrong-order access, pending candidate denial, expired guest session, revoked entitlement.
- Neon transactions/concurrency and backup restore on the actual managed service.
- Chrome/Android and Safari/iOS upload/UPI return/download behavior; 320, 375, 768, 1024, 1440 px layouts and keyboard/screen-reader use.
- Rate limits at the trusted proxy; current defaults group proxy-origin traffic conservatively.
- Policy approval, actual portrait quality and handling of late/partial payment or a disputed introductory reservation.

## Troubleshooting

- `EAI_AGAIN`: DNS/network cannot resolve the Neon hostname. Check the configured endpoint in Neon and run migrations from your normal network; do not disable TLS.
- `model_not_found`: choose an accessible text model via the Groq dashboard. `openai/gpt-oss-20b` worked for the supplied account during verification.
- Cloudinary timeout: provider/network latency can leave an uncertain upload outcome. Inspect the account and retry verification; never call it delivered until bytes and access denials are tested.
- 403 Origin: browser must use exactly PUBLIC_APP_URL. Caddy and Vite preserve the browser Origin. API clients must send it for mutations.
- 401 admin: session idle/absolute expiry or changed password. Unlock again. Login throttles expire after 15 minutes; don't bypass them in production.
- Install/runtime error: use the pinned Bun version and `bun install --frozen-lockfile`. No dependency directory is bundled.
- Existing `.env`: setup:demo deliberately preserves it. Move a LIVE environment aside yourself if you want a separate demo; never run migrations against an unintended database.
