# Material Analysis Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox tracking.

## Task 1: Make model image references reliable

- [ ] Add failing storage tests for Vercel Blob conversion, unsupported MIME types, oversized files, and untouched non-Blob public URLs.
- [ ] Update `toBailianImageReference` to fetch only trusted Vercel Blob hosts, validate JPEG/PNG/WebP and the 7 MiB raw-byte limit, then return a Base64 data URL.
- [ ] Run `npm test -- tests/files/storage.test.ts`.

## Task 2: Return actionable analysis errors

- [ ] Add failing API tests for safe 400 input errors and safe 502 provider errors with structured logging.
- [ ] Catch analysis failures in the route, avoid logging URLs or secrets, and preserve successful generation records.
- [ ] Run `npm test -- tests/api/ai-routes.test.ts`.

## Task 3: Verify and deploy

- [ ] Run the full test suite, lint, TypeScript check, and production build.
- [ ] Commit and push the feature branch, fast-forward it into `main`, and push `main`.
- [ ] Confirm the resulting production deployment is ready and inspect its runtime status.
