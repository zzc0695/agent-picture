# Vercel Neon URL Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Preview deployments use Neon’s `STORAGE_URL` when `DATABASE_URL` is absent, while preserving `DATABASE_URL` as the preferred setting.

**Architecture:** Centralize environment-variable precedence in a small server-only helper. The Prisma runtime client and Prisma build configuration call the helper so they cannot disagree about which Postgres URL to use. Tests validate the helper independently of a live database.

**Tech Stack:** TypeScript, Next.js 16, Prisma 7, Vitest 4, Vercel Neon integration.

---

## File Structure

- Create: `lib/db-url.ts` — resolves a database URL from a supplied environment object.
- Modify: `lib/db.ts` — uses the shared resolver before creating `PrismaPg`.
- Modify: `prisma.config.ts` — uses the same resolver during Prisma generation and builds.
- Create: `tests/db-url.test.ts` — unit tests for precedence, Neon fallback, and the missing-config error.

### Task 1: Database URL resolver

**Files:**
- Create: `lib/db-url.ts`
- Create: `tests/db-url.test.ts`

- [ ] **Step 1: Write the failing resolver tests**

```ts
// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "@/lib/db-url";

describe("getDatabaseUrl", () => {
  it("prefers DATABASE_URL when both variables are set", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgresql://primary.example/app",
        STORAGE_URL: "postgresql://neon.example/app",
      }),
    ).toBe("postgresql://primary.example/app");
  });

  it("uses STORAGE_URL from the Neon integration when DATABASE_URL is absent", () => {
    expect(getDatabaseUrl({ STORAGE_URL: "postgresql://neon.example/app" })).toBe(
      "postgresql://neon.example/app",
    );
  });

  it("throws the existing configuration error when no database URL is available", () => {
    expect(() => getDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/db-url.test.ts`

Expected: FAIL because `@/lib/db-url` does not exist.

- [ ] **Step 3: Implement the resolver**

```ts
export function getDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const databaseUrl = env.DATABASE_URL ?? env.STORAGE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/db-url.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the resolver and test**

```bash
git add lib/db-url.ts tests/db-url.test.ts
git commit -m "feat: support Neon storage database URL"
```

### Task 2: Use the resolver in Prisma startup paths

**Files:**
- Modify: `lib/db.ts:1-13`
- Modify: `prisma.config.ts:1-13`

- [ ] **Step 1: Replace the runtime-only lookup in `lib/db.ts`**

```ts
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { getDatabaseUrl } from "./db-url";

const databaseUrl = getDatabaseUrl(process.env);
```

Leave the existing `PrismaPg`, `PrismaClient`, logging, and global-client reuse code unchanged.

- [ ] **Step 2: Replace the Prisma config lookup in `prisma.config.ts`**

```ts
import "dotenv/config";

import { defineConfig } from "prisma/config";

import { getDatabaseUrl } from "./lib/db-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(process.env),
  },
});
```

- [ ] **Step 3: Run the focused resolver test and complete test suite**

Run: `npm test -- tests/db-url.test.ts` then `npm test`

Expected: resolver tests and the existing full suite pass.

- [ ] **Step 4: Run the production build using the local standard configuration**

Run: `npm run build`

Expected: Prisma generation and Next.js build complete successfully.

- [ ] **Step 5: Commit the Prisma integration**

```bash
git add lib/db.ts prisma.config.ts
git commit -m "fix: resolve Neon database URL during builds"
```

### Task 3: Publish and verify Preview

**Files:**
- No source-file changes.

- [ ] **Step 1: Push the two commits to the tracked Preview branch**

Run: `git push origin codex/ai-studio-ui-replacement`

Expected: GitHub accepts the commits and Vercel starts a new Preview deployment.

- [ ] **Step 2: Inspect the new Vercel build log**

Use the Vercel project deployment list and build log for the new commit.

Expected: the previous `DATABASE_URL is required` error is absent and the deployment reaches Ready.

- [ ] **Step 3: Open the Preview URL and verify the login page loads**

Expected: `/login` renders without a server error.

## Plan Self-Review

- Spec coverage: Task 1 covers fallback precedence and missing-variable behavior; Task 2 applies the shared result to runtime and build paths; Task 3 produces and checks an independent Preview deployment.
- Placeholder scan: no unresolved placeholders or generic test instructions remain.
- Type consistency: `getDatabaseUrl` is defined once, accepts `NodeJS.ProcessEnv`, and is imported by both startup paths and its test.

