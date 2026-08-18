# Production Database Migrations Design

## Goal

Ensure every Vercel deployment applies pending Prisma migrations before the
Next.js production build. A new Neon database must receive the application's
tables automatically, and later schema changes must be deployed without a
separate manual database step.

## Approach

Use Prisma's production-safe `migrate deploy` command in the application build
script. The deployment sequence will be:

1. `prisma migrate deploy`
2. `prisma generate`
3. `next build`

`prisma migrate deploy` applies only committed migrations that have not already
been recorded in the target database. It does not generate new migrations or
reset existing data.

## Configuration

Update the `build` script in `package.json` so the same ordered sequence runs on
Vercel and in explicit local production builds. The existing database URL
resolver continues to accept `DATABASE_URL` or `STORAGE_URL`; no connection
string is added to source control.

Production and Preview deployments use the database credentials injected for
their respective Vercel environments. The Neon connection must therefore be
enabled for both environments when both should be deployable.

## Failure Behavior

If the database connection is missing, invalid, or a migration fails, the build
stops before `next build`. Vercel will keep the previous successful production
deployment active instead of publishing an application whose database schema is
out of date.

## Verification

- Run the existing automated test suite.
- Run a production build against a disposable or configured test database when
  available.
- Push the verified commit to `main` and wait for the Vercel Production
  deployment.
- Confirm the deployment build log reports successful Prisma migrations.
- Verify the production application loads and database-backed routes no longer
  fail because tables are missing.
- Verify text and image generation endpoints without exposing API credentials.

## Non-Goals

- Creating migrations dynamically during deployment.
- Resetting or deleting database data.
- Seeding demo credentials automatically on every deployment.
- Storing Neon or DashScope credentials in the repository.
