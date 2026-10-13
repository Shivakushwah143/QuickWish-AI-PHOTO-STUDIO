# QuickWish — AI Photo Studio

React + TypeScript + Vite + Tailwind frontend; Bun/Hono backend; PostgreSQL + Drizzle; private Cloudinary media; Groq birthday text. Portrait generation and UPI reconciliation are **manual**.

## Start a safe local demo

Install **Bun 1.4.3** and Docker Desktop (PostgreSQL only). From the extracted `quickwish` folder:

```bash
bun install --frozen-lockfile
bun run setup:demo
bun run dev
```

`setup:demo` creates `apps/api/.env`, starts local PostgreSQL, migrates the `quickwish` schema, seeds six concept styles and four packages, and writes a random admin password to **`.private/demo-admin-password.txt`**. It will not overwrite an existing environment file. Use `cat .private/demo-admin-password.txt` (PowerShell: `Get-Content .private/demo-admin-password.txt`) to read the demo password on your computer. It is not included in this archive.

- Website: **http://localhost:5173**
- Studio: **http://localhost:5173/admin**
- API health: **http://localhost:3001/healthz**
- Database readiness: **http://localhost:3001/readyz**

Use `localhost` consistently in your browser because request Origin is checked. The Vite proxy sends `/api` to Bun. Leave both processes running in the terminal. `Ctrl+C` stops both.

Windows: extract to a normal writable directory, enable Docker Desktop's Linux containers/WSL2, open PowerShell there, and run the same commands. If Docker is unavailable, start your own PostgreSQL instance and set `DATABASE_URL` in `apps/api/.env`, then run `bun run db:migrate`, `bun run db:seed`, and `bun run admin:password`.

### Exact Windows PowerShell commands

With Bun 1.4.3 installed, Docker Desktop running, and PowerShell opened in the folder containing the ZIP:

```powershell
Expand-Archive -LiteralPath .\quickwish-ai-photo-studio-complete.zip -DestinationPath .\quickwish-project
Set-Location .\quickwish-project\quickwish
bun install --frozen-lockfile
bun run setup:demo
Get-Content .\.private\demo-admin-password.txt
bun run dev
```

Open `http://localhost:5173` and `http://localhost:5173/admin`. Keep the password private. In a second PowerShell terminal in the same project folder, the lightweight checks are:

```powershell
bun run typecheck
bun run test
bun run test:local
bun run build
```

For LIVE verification, use a separate extracted project folder. Create and privately edit the backend environment before running these commands:

```powershell
Copy-Item .\apps\api\.env.example .\apps\api\.env
notepad .\apps\api\.env
# Enter your real provider values and MODE=LIVE, then save and close Notepad.
bun run admin:password
bun run db:migrate
if ($LASTEXITCODE -ne 0) { throw "Migration failed; check Neon DNS/network before continuing." }
bun run db:seed
bun run verify:live
bun run doctor
```

`doctor` will still block LIVE startup until merchant details, support contact and approved policies are configured. For a retained verification fixture, retry `bun run verify:cleanup`; uncertain older fixtures require inspection in Cloudinary.

**No real UPI QR exists in DEMO.** No automatic production follows a payment claim. Birthday wishes use a labelled deterministic sample unless you deliberately configure a Groq key. Customer photos and candidates are stored privately in `.private/media`, outside web assets.

## Exercise the full manual workflow

1. Browse `/styles`, choose a style, select a JPEG/PNG/WebP selfie (128 px minimum, 8 MB maximum, 24 MP maximum), enter phone, choose a package, and explicitly consent.
2. Save the private order link shown at checkout. It is a secret capability; only hashes are stored. The app removes the token fragment after exchanging it for a scoped HttpOnly cookie. Links expire after 14 days by default.
3. In demo checkout submit an example UTR such as `DEMO123456`. This remains unverified. No money is sent.
4. Open `/admin` in another tab and enter the generated password. Choose Payments, select the claim, and click **Create demo ledger fixture**. Copy the displayed demo bank reference. Enter that reference, the exact amount and payee, current local credit timestamp, an evidence note and the independent-review checkbox. For INTRO also attest buyer eligibility. In LIVE the fixture button and endpoint are disabled; inspect the actual receiving bank yourself.
5. Confirm reviewed credit, then open Orders. Open the order, securely view its source, and use ChatGPT manually as permitted by the user's consent. No ChatGPT automation exists.
6. Start generation for a slot, upload a candidate image, and complete the seven QC checks. Add a reason and explicitly approve. Rejected/superseded candidates cannot be released.
7. Return to the private customer link and refresh. Only approved slots download; a 3-photo package can have one ready and two pending.
8. Try birthday wishes, support cases, refund recording or access revocation. Record refunds only after an actual confirmed return transfer in LIVE; future downloads are denied after a full refund or explicit revocation.

Original vector concepts are included; they are **not photographs or proof of output quality**. Replace with rights-cleared, representative photo samples before real sales. LIVE seeding leaves concept styles hidden. Gallery admin supports public Cloudinary reference uploads and publishing.

## Checks (no browser installation needed for the first three)

```bash
bun run typecheck
bun run test
bun run test:local
bun run build
```

`test` uses PGlite only as a test harness to execute actual PostgreSQL DDL and triggers. `test:local` starts an isolated temporary PGlite socket and the real Bun API, runs the manual-flow API test, then deletes its temporary media/database. Neither changes your Neon database nor uses your real keys. This test harness is not the demo or production storage adapter, and does not establish Neon or real PostgreSQL concurrency performance.

For a normal running Docker/PostgreSQL demo, `bun run test:integration` creates synthetic demo records through the API. It uses the generated password file or `TEST_ADMIN_PASSWORD` in your environment. It refuses to run against LIVE mode. Reset only a disposable demo database if you want those test records removed.

Browser checks are optional, separate and not required by setup:

```bash
bunx playwright install chromium
bun run test:e2e
```

They need a running demo at localhost:5173. This build session intentionally did not install a browser. See `docs/verification-report.md` for actual executed results and remaining checks.

## LIVE configuration

**Credentials are intentionally absent from this ZIP.** The supplied values were used only in a private backend environment during verification; that environment was removed during final cleanup. On your machine:

```bash
cp apps/api/.env.example apps/api/.env
# PowerShell: Copy-Item apps/api/.env.example apps/api/.env
```

Edit that backend file privately:

- `MODE=LIVE`
- Your Neon `DATABASE_URL`, including `sslmode=require`; optional `DATABASE_DIRECT_URL` pointing to the **same database** for migrations.
- Cloudinary cloud **`drsshjvzm`**, supplied API key and secret. `PhotoAI` is not the selected cloud identifier.
- Supplied `GROQ_API_KEY`; **`GROQ_MODEL=openai/gpt-oss-20b`** was selected from the account's active-model response and successfully called. The originally proposed Llama model returned `model_not_found`.
- Your real merchant `UPI_MERCHANT_VPA`, `UPI_MERCHANT_NAME`, support `SUPPORT_WHATSAPP_E164`.
- Approved review hours, delivery/correction/refund copy and retention policy. Only then set `POLICIES_APPROVED=true`.
- `PUBLIC_APP_URL` must match the browser's origin. For a VPS use HTTPS and `NODE_ENV=production`.

Then:

```bash
bun run admin:password
bun run db:migrate
bun run db:seed
bun run verify:live
bun run doctor
bun run dev
```

`admin:password` securely reads a new 16+ character password without terminal echo, stores an Argon2id hash and invalidates old sessions through password-version checks. It never prints the password/hash. LIVE startup refuses missing payment/support/provider settings or unapproved policies. No merchant VPA, admin password, support number or bank credit was invented for you.

`verify:live` makes one real birthday completion and a generated solid-color image round trip. It checks unsigned original/transform denials and deletes the fixture. It reports failed cleanup honestly and stores sanitized results; provider timeouts can occur. The Neon connection failed here with `EAI_AGAIN`; migrations must be run from a network that resolves your Neon endpoint.

## Security behavior

- Prices and quantities come from server packages; immutable quoted amount/payee snapshots.
- UTRs are claims, never payment success. Independent review data plus unique `(payee,reference)` prevents double-credit funding. The app records the human review, **not proof that a bank check actually happened**.
- Guest links have 256-bit random secrets; only SHA-256 digests in PostgreSQL. Separate per-order sessions; no localStorage credentials. Do not put private links in WhatsApp.
- Password-only admin uses Argon2id, hashed opaque sessions, 30-minute idle/12-hour absolute expiration, global and peer-IP login limits and same-Origin mutation checks.
- Uploads decode/re-encode to WebP, remove EXIF/GPS, and enforce size/dimensions. Export retains full pixel dimensions without watermark; encoding may change original compression.
- Private uploads use Cloudinary `authenticated`. Signed provider URLs stay server-side; the API proxies bytes after current entitlement/approval checks. Media responses are `no-store`.
- Approval binds a specific candidate to its owning slot. Refund/revocation prevents new grants; already downloaded bytes cannot be recalled.
- Rate limits are DB-backed. By default the Bun peer IP is used, without trusting forwarded headers. Behind a reverse proxy this groups clients under the proxy IP; configure an additional edge limit and review trusted-proxy policy before scaling.
- Financial verifications and audit rows are append-only. Do not run the application with a database superuser in production.

## Operations / limitations

See `docs/deployment.md`, `docs/implementation-decisions.md`, and `docs/requirements-traceability.md`. This is a runnable pilot implementation, **not a claim of production launch approval**. Business policies, actual sample photography, bank-payment acceptance, browser/device checks, Neon connectivity and backup/restore still require operator validation.

No heavy model training, image-generation automation, load test, browser download or VPS deployment was performed.
