# Production Database Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply committed Prisma migrations automatically before every Vercel production build so a connected Neon database is initialized and kept compatible with the application.

**Architecture:** Keep deployment orchestration in the existing npm `build` script. Run Prisma's idempotent production migration command before client generation and the Next.js build, fail the deployment on migration errors, and document the resulting Vercel behavior.

**Tech Stack:** npm scripts, Prisma 7, PostgreSQL/Neon, Next.js 16, Vitest, Vercel

---

## File Structure

- Create `tests/build-script.test.ts`: verifies the ordered, production-safe build pipeline.
- Modify `package.json`: adds `prisma migrate deploy` before Prisma generation and Next.js compilation.
- Modify `docs/deployment/vercel.md`: records automatic migrations and the required Vercel environment scope.

### Task 1: Protect the production build sequence with a test

**Files:**
- Create: `tests/build-script.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import packageJson from "../package.json";

describe("production build script", () => {
  it("deploys migrations before generating Prisma and building Next.js", () => {
    expect(packageJson.scripts.build).toBe(
      "prisma migrate deploy && prisma generate && next build",
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/build-script.test.ts`

Expected: FAIL because the current build script is `prisma generate && next build`.

- [ ] **Step 3: Commit the failing regression test**

```powershell
git add tests/build-script.test.ts
git commit -m "test: require migrations before production build"
```

### Task 2: Enable automatic Prisma migrations

**Files:**
- Modify: `package.json:7`

- [ ] **Step 1: Update the build script**

Replace the existing build entry with:

```json
"build": "prisma migrate deploy && prisma generate && next build"
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run: `npm test -- tests/build-script.test.ts`

Expected: PASS with one passing test.

- [ ] **Step 3: Run the full automated test suite**

Run: `npm test`

Expected: all tests pass with no regressions.

- [ ] **Step 4: Verify the build fails closed without a database URL**

Run in a shell where `DATABASE_URL` and `STORAGE_URL` are unset: `npm run build`

Expected: the command stops during `prisma migrate deploy` with a missing database URL error and does not run `next build`.

- [ ] **Step 5: Commit the implementation**

```powershell
git add package.json
git commit -m "build: deploy Prisma migrations automatically"
```

### Task 3: Update deployment documentation

**Files:**
- Modify: `docs/deployment/vercel.md:34-48`

- [ ] **Step 1: Replace the manual migration instructions**

Use this content under `## Build And Database Setup`:

```markdown
The production build runs:

\`\`\`powershell
npm run build
\`\`\`

The build automatically runs `prisma migrate deploy` before `prisma generate`
and `next build`. Vercel must provide `DATABASE_URL` or `STORAGE_URL` to both
Production and Preview environments that should deploy. A missing connection or
failed migration stops the deployment before the application build.

Seed the demo merchant only if this environment should include the demo login:
```

- [ ] **Step 2: Run documentation and patch checks**

Run: `rg -n "prisma migrate deploy|DATABASE_URL|STORAGE_URL" docs/deployment/vercel.md`

Expected: the document describes automatic deployment migrations and both accepted connection variables.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Commit the documentation**

```powershell
git add docs/deployment/vercel.md
git commit -m "docs: explain automatic Vercel migrations"
```

### Task 4: Publish and verify Production

**Files:**
- No additional repository files.

- [ ] **Step 1: Push the verified head to the feature branch and fast-forward `main`**

Run:

```powershell
git push origin codex/ai-studio-ui-replacement
git push origin codex/ai-studio-ui-replacement:main
```

Expected: both refs advance without a force push. If normal Git transport is unavailable, update `main` to the exact verified head SHA through the authenticated GitHub API with `force=false`.

- [ ] **Step 2: Wait for the Vercel Production deployment**

Expected build-log sequence:

```text
prisma migrate deploy
prisma generate
next build
```

Expected deployment state: `READY` for the `main` commit.

- [ ] **Step 3: Verify database-backed application behavior**

Open the production alias and verify the home page responds successfully. Exercise login or another database-backed route and confirm there is no missing-table or database-connection error in Vercel runtime logs.

- [ ] **Step 4: Verify AI endpoints without exposing credentials**

Run one text-generation request and one image-generation request through the application UI. Confirm both complete successfully and that neither logs nor responses contain `DASHSCOPE_API_KEY`.

- [ ] **Step 5: Record the deployment result**

Report the final commit SHA, Production deployment URL/state, migration result, and any remaining environment requirements. Do not include database URLs, access tokens, or API keys.
