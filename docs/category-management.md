# Category and gallery operations

Apply database changes:

```bash
bun --env-file=apps/api/.env scripts/migrate.ts
```

Seed the default packages, categories and demo styles idempotently:

```bash
bun --env-file=apps/api/.env scripts/seed.ts
```

The seed keeps existing admin edits by using `ON CONFLICT DO NOTHING` for categories and styles. Admin-created public images are managed from `/admin/categories` and `/admin/styles`; customer uploads, payment proofs and QC candidates remain private media.
