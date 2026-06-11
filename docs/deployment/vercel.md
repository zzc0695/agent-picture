# Vercel Deployment

This app is a Next.js App Router project with server routes, Prisma, OpenAI
wrappers, and image uploads. Vercel can host the frontend and backend routes, but
production data must use managed storage instead of the local SQLite database
and `storage/` directory used during early MVP development.

## Services

- Vercel project for the Next.js app.
- Postgres database, such as Neon, Supabase, or a Vercel Marketplace Postgres
  integration.
- Vercel Blob store for uploaded customer room images, sample images, and
  generated effect images.
- OpenAI API key for prompt optimization, marketing copy, and image generation.

## Environment Variables

Set these in Vercel Project Settings:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
SESSION_SECRET="use-a-32-plus-character-random-secret"
OPENAI_API_KEY="sk-..."
OPENAI_TEXT_MODEL="gpt-5-mini"
OPENAI_IMAGE_MODEL="gpt-image-1"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

`LOCAL_FILE_ROOT` is only for local development when `BLOB_READ_WRITE_TOKEN` is
not set.

## Build And Database Setup

The production build runs:

```powershell
npm run build
```

That script runs `prisma generate` before `next build`.

Run database migrations against the production Postgres database before using
the deployed app:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
npm run prisma:deploy
```

Seed the demo merchant only if this environment should include the demo login:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
npm run prisma:seed
```

The demo account from the seed script is:

```text
demo@example.com / demo123456
```

## Storage Behavior

When `BLOB_READ_WRITE_TOKEN` is set, uploads and generated images are written to
Vercel Blob and the app stores the returned public Blob URL.

When `BLOB_READ_WRITE_TOKEN` is empty, uploads and generated images are written
to `LOCAL_FILE_ROOT` and served through `/uploads/[file]`. This is only intended
for local development.

## Deployment Checklist

1. Create the Vercel project and connect this repository/branch.
2. Create or connect a Postgres database and copy its pooled connection string
   into `DATABASE_URL`.
3. Create a Vercel Blob store and copy `BLOB_READ_WRITE_TOKEN`.
4. Add `SESSION_SECRET`, `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, and
   `OPENAI_IMAGE_MODEL`.
5. Run `npm run prisma:deploy` once against the production database.
6. Run `npm run prisma:seed` if the demo account should exist.
7. Deploy on Vercel and verify login, upload, prompt optimization, image
   generation, marketing copy, saving plans, and records.
