# Vercel Neon URL Fallback Design

## Goal

Allow the application to use the Neon integration's automatically injected
`STORAGE_URL` when `DATABASE_URL` has not been configured, without changing
the preferred production configuration.

## Design

Define the database URL once in each startup path as:

1. `DATABASE_URL`, when present.
2. `STORAGE_URL`, only when `DATABASE_URL` is absent.
3. The existing clear configuration error when neither variable exists.

Apply this resolution in both `lib/db.ts`, which creates the runtime Prisma
client, and `prisma.config.ts`, which Prisma reads during generation and build.
This prevents a Vercel Preview build from failing before routes are generated.

`DATABASE_URL` remains the documented and preferred setting. The fallback is
specifically for Vercel Marketplace integrations that expose a compatible
Postgres URL under `STORAGE_URL`.

## Verification

Add tests covering URL resolution with `DATABASE_URL`, with only `STORAGE_URL`,
and with neither variable. Run the full test suite and a production build.
Push the change to the existing Preview branch to produce a new, independent
Vercel deployment.
