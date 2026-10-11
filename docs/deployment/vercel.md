# Vercel Deployment

This app is a Next.js App Router project with server routes, Prisma, OpenAI
compatible Qwen clients, and image uploads. Vercel can host the frontend and backend routes, but
production data must use managed storage instead of the local SQLite database
and `storage/` directory used during early MVP development.

## Services

- Vercel project for the Next.js app.
- Postgres database, such as Neon, Supabase, or a Vercel Marketplace Postgres
  integration.
- Vercel Blob store for uploaded customer room images, sample images, and
  generated effect images.
- Alibaba Cloud Bailian (DashScope) API key for material analysis, prompt optimization, marketing copy, and image generation.

## Environment Variables

Set these in Vercel Project Settings:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
SESSION_SECRET="use-a-32-plus-character-random-secret"
DASHSCOPE_API_KEY="your-dashscope-api-key"
DASHSCOPE_TEXT_MODEL="qwen3.7-flash"
DASHSCOPE_IMAGE_MODEL="qwen-image-3.0"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

`LOCAL_FILE_ROOT` is only for local development when `BLOB_READ_WRITE_TOKEN` is
not set.

The model names above match the defaults in `lib/ai/bailian.ts`; configure models
available to your DashScope account. If the key is absent, AI endpoints return a
503 error. The app does not present stock text or the input photo as AI output.

## Build And Database Setup

The production build runs:

```powershell
npm run build
```

The build automatically runs `prisma migrate deploy` before `prisma generate`
and `next build`. Vercel must provide `DATABASE_URL` or `STORAGE_URL` to both
Production and Preview environments that should deploy. A missing connection or
failed migration stops the deployment before the application build.

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
4. Add `SESSION_SECRET`, `DASHSCOPE_API_KEY`, `DASHSCOPE_TEXT_MODEL`, and
   `DASHSCOPE_IMAGE_MODEL`.
5. Run `npm run prisma:deploy` once against the production database.
6. Run `npm run prisma:seed` if the demo account should exist.
7. Deploy on Vercel and verify login, upload, prompt optimization, image
   generation, marketing copy, saving plans, and records.
