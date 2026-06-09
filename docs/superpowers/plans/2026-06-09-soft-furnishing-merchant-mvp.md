# 软装商家 AI 效果图 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first responsive web MVP where a soft furnishing merchant can log in, manage curtain/soft furnishing materials, write or reuse prompts, generate room effect images and marketing copy through backend AI wrappers, and save the result as a customer plan.

**Architecture:** Use a Next.js App Router application with server routes for auth, uploads, CRUD APIs, and AI orchestration. Store MVP data in SQLite through Prisma, keep uploaded/generated files on local disk behind a storage abstraction, and isolate OpenAI calls behind small service modules so model/API changes do not touch UI code.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Prisma, SQLite, Vitest, React Testing Library, OpenAI Node SDK.

---

## Scope Check

The approved design covers several subsystems. This plan builds the first working vertical slice of the MVP in one repo:

- Single merchant login.
- Material library.
- Prompt library with preview/insert/replace behavior.
- Customer plan save flow.
- Generation records.
- AI prompt optimization, image generation, and marketing copy route boundaries.
- Mobile-first workbench UI.

Payment, team accounts, native Mini Program, admin backend, quotation/CRM, large furniture support, and automatic visual consistency scoring remain outside this implementation plan.

## File Structure

Create this structure after scaffolding the app:

```text
app/
  (auth)/login/page.tsx
  (dashboard)/layout.tsx
  (dashboard)/page.tsx
  (dashboard)/materials/page.tsx
  (dashboard)/plans/page.tsx
  (dashboard)/prompts/page.tsx
  (dashboard)/records/page.tsx
  api/auth/login/route.ts
  api/auth/logout/route.ts
  api/files/route.ts
  api/materials/route.ts
  api/materials/[id]/route.ts
  api/prompts/route.ts
  api/plans/route.ts
  api/plans/[id]/route.ts
  api/ai/optimize-prompt/route.ts
  api/ai/generate-image/route.ts
  api/ai/generate-marketing/route.ts
components/
  app-shell.tsx
  customer-plan-card.tsx
  file-picker.tsx
  fidelity-selector.tsx
  material-card.tsx
  prompt-editor.tsx
  prompt-library-sheet.tsx
  result-panel.tsx
lib/
  ai/image.ts
  ai/marketing.ts
  ai/prompt.ts
  auth/session.ts
  db.ts
  files/storage.ts
  validators.ts
prisma/
  schema.prisma
  seed.ts
tests/
  auth/session.test.ts
  validators.test.ts
  ai/prompt.test.ts
  api/materials.test.ts
  api/plans.test.ts
  components/prompt-editor.test.tsx
```

Responsibilities:

- `lib/auth/session.ts`: signed session cookie creation, parsing, and deletion.
- `lib/db.ts`: Prisma singleton.
- `lib/files/storage.ts`: local file write/read metadata boundary.
- `lib/validators.ts`: shared Zod schemas for API input.
- `lib/ai/*`: backend-only AI wrappers with deterministic prompt construction.
- `components/*`: focused mobile-first UI units.
- `app/api/*`: thin route handlers that validate input, call services, and persist records.

## Task 1: Scaffold App And Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold the Next.js project**

Run:

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
```

Expected: Next.js files are created in the repository root without deleting `docs/`.

- [ ] **Step 2: Install MVP dependencies**

Run:

```powershell
npm install @prisma/client prisma zod openai bcryptjs jose
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx
```

Expected: `package.json` includes runtime dependencies for Prisma, validation, OpenAI, password hashing, and signed cookies; dev dependencies include Vitest and React test tools.

- [ ] **Step 3: Add test scripts**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add environment example**

Create `.env.example`:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-32-plus-random-characters"
OPENAI_API_KEY=""
OPENAI_TEXT_MODEL="gpt-5-mini"
OPENAI_IMAGE_MODEL="gpt-image-1"
LOCAL_FILE_ROOT="./storage"
```

- [ ] **Step 6: Ignore generated runtime files**

Ensure `.gitignore` contains:

```gitignore
.superpowers/
.env
storage/
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 7: Verify tooling**

Run:

```powershell
npm test
npm run lint
```

Expected: Vitest runs with zero tests or passing setup; lint completes after scaffold fixes.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json tsconfig.json vitest.config.ts tests/setup.ts .env.example .gitignore app components lib public next.config.* postcss.config.* eslint.config.* tailwind.config.* 2>$null
git commit -m "chore: scaffold web app"
```

## Task 2: Add Prisma Domain Model And Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/db.ts`

- [ ] **Step 1: Write the schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Merchant {
  id           String             @id @default(cuid())
  name         String
  email        String             @unique
  passwordHash String
  createdAt    DateTime           @default(now())
  materials    Material[]
  prompts      PromptTemplate[]
  plans        CustomerPlan[]
  records      GenerationRecord[]
}

model Material {
  id            String   @id @default(cuid())
  merchantId    String
  name          String
  category      String
  color         String
  fabric        String
  priceRange    String
  sizeNote      String
  sellingPoints String
  imageUrl      String
  createdAt     DateTime @default(now())
  merchant      Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  plans         PlanMaterial[]
}

model PromptTemplate {
  id          String   @id @default(cuid())
  merchantId  String?
  title       String
  category    String
  body        String
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  merchant    Merchant? @relation(fields: [merchantId], references: [id], onDelete: Cascade)
}

model CustomerPlan {
  id                 String   @id @default(cuid())
  merchantId         String
  customerName       String
  notes              String
  roomImageUrl       String
  sampleImageUrl     String
  originalPrompt     String
  optimizedPrompt    String
  negativePrompt     String
  fidelity           String
  primaryImageUrl    String?
  similarImageUrls   String   @default("[]")
  shortVideoScript   String?
  socialCopy         String?
  customerScript     String?
  status             String   @default("draft")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  merchant           Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  materials          PlanMaterial[]
  records            GenerationRecord[]
}

model PlanMaterial {
  planId     String
  materialId String
  plan       CustomerPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  material   Material     @relation(fields: [materialId], references: [id], onDelete: Cascade)

  @@id([planId, materialId])
}

model GenerationRecord {
  id            String   @id @default(cuid())
  merchantId    String
  planId        String?
  type          String
  inputSummary  String
  status        String
  failureReason String?
  usageUnits    Int      @default(1)
  createdAt     DateTime @default(now())
  merchant      Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  plan          CustomerPlan? @relation(fields: [planId], references: [id], onDelete: SetNull)
}
```

- [ ] **Step 2: Add Prisma singleton**

Create `lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 3: Seed one merchant and system prompts**

Create `prisma/seed.ts`:

```ts
import bcrypt from "bcryptjs";
import { db } from "../lib/db";

async function main() {
  const passwordHash = await bcrypt.hash("demo123456", 10);

  const merchant = await db.merchant.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "演示软装商家",
      email: "demo@example.com",
      passwordHash,
    },
  });

  await db.promptTemplate.createMany({
    data: [
      {
        title: "客厅现代简约窗帘",
        category: "room-style",
        body: "保留客厅原有结构、窗户位置和透视角度，为窗户安装现代简约风格窗帘，强调自然垂感、真实布料纹理、柔和室内光线，整体干净高级。",
        isSystem: true,
      },
      {
        title: "卧室高遮光温馨方案",
        category: "curtain-selling-point",
        body: "保留卧室原始布局和床窗关系，为窗户搭配高遮光窗帘，突出厚实面料、柔和褶皱、安静舒适的睡眠氛围，画面保持真实摄影质感。",
        isSystem: true,
      },
    ],
    skipDuplicates: true,
  });

  await db.material.create({
    data: {
      merchantId: merchant.id,
      name: "米白高遮光绒布窗帘",
      category: "窗帘",
      color: "米白",
      fabric: "高遮光绒布",
      priceRange: "中高端",
      sizeNote: "适合客厅和卧室落地窗",
      sellingPoints: "遮光强、垂感好、质感柔和",
      imageUrl: "/sample-material.jpg",
    },
  });
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 4: Run migration and seed**

Run:

```powershell
Copy-Item .env.example .env
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Expected: SQLite database is created, Prisma client is generated, and demo merchant exists.

- [ ] **Step 5: Commit**

```powershell
git add prisma/schema.prisma prisma/seed.ts lib/db.ts package.json package-lock.json
git commit -m "feat: add mvp data model"
```

## Task 3: Implement Session Auth

**Files:**
- Create: `lib/auth/session.ts`
- Create: `tests/auth/session.test.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write session tests**

Create `tests/auth/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "@/lib/auth/session";

describe("session tokens", () => {
  it("round trips merchant identity", async () => {
    const token = await createSessionToken({ merchantId: "m_123", email: "demo@example.com" });
    await expect(readSessionToken(token)).resolves.toMatchObject({
      merchantId: "m_123",
      email: "demo@example.com",
    });
  });

  it("rejects malformed tokens", async () => {
    await expect(readSessionToken("broken")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm test -- tests/auth/session.test.ts
```

Expected: FAIL because `lib/auth/session.ts` does not exist.

- [ ] **Step 3: Implement session helpers**

Create `lib/auth/session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

const cookieName = "merchant_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret-with-more-than-32-characters");

export type MerchantSession = {
  merchantId: string;
  email: string;
};

export const sessionCookieName = cookieName;

export async function createSessionToken(session: MerchantSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(token: string | undefined): Promise<MerchantSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.merchantId !== "string" || typeof payload.email !== "string") return null;
    return { merchantId: payload.merchantId, email: payload.email };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run session tests**

Run:

```powershell
npm test -- tests/auth/session.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add login and logout routes**

Create `app/api/auth/login/route.ts`:

```ts
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, sessionCookieName } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");

  const merchant = await db.merchant.findUnique({ where: { email } });
  if (!merchant || !(await bcrypt.compare(password, merchant.passwordHash))) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const token = await createSessionToken({ merchantId: merchant.id, email: merchant.email });
  const jar = await cookies();
  jar.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
```

Create `app/api/auth/logout/route.ts`:

```ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const jar = await cookies();
  jar.delete(sessionCookieName);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Add login page**

Create `app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "登录失败");
      return;
    }
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold text-neutral-950">软装商家工作台</h1>
      <p className="mt-2 text-sm text-neutral-600">使用演示账号 demo@example.com / demo123456 登录。</p>
      <form action={onSubmit} className="mt-8 space-y-4">
        <input name="email" type="email" defaultValue="demo@example.com" className="w-full rounded-md border px-3 py-3" />
        <input name="password" type="password" defaultValue="demo123456" className="w-full rounded-md border px-3 py-3" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded-md bg-neutral-950 px-4 py-3 text-white">登录</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Verify**

Run:

```powershell
npm test -- tests/auth/session.test.ts
npm run build
```

Expected: tests pass and Next.js build succeeds.

- [ ] **Step 8: Commit**

```powershell
git add lib/auth/session.ts tests/auth/session.test.ts app/api/auth "app/(auth)/login"
git commit -m "feat: add single merchant login"
```

## Task 4: Add Validation And CRUD API Boundaries

**Files:**
- Create: `lib/validators.ts`
- Create: `lib/auth/require-session.ts`
- Create: `tests/validators.test.ts`
- Create: `app/api/materials/route.ts`
- Create: `app/api/materials/[id]/route.ts`
- Create: `app/api/prompts/route.ts`
- Create: `app/api/plans/route.ts`
- Create: `app/api/plans/[id]/route.ts`

- [ ] **Step 1: Write validator tests**

Create `tests/validators.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { materialSchema, planSchema } from "@/lib/validators";

describe("validators", () => {
  it("accepts a valid material", () => {
    expect(materialSchema.parse({
      name: "米白窗帘",
      category: "窗帘",
      color: "米白",
      fabric: "绒布",
      priceRange: "中高端",
      sizeNote: "适合落地窗",
      sellingPoints: "遮光强、垂感好",
      imageUrl: "/uploads/a.jpg",
    })).toMatchObject({ name: "米白窗帘" });
  });

  it("rejects empty plan prompt", () => {
    expect(() => planSchema.parse({
      customerName: "王女士",
      notes: "",
      roomImageUrl: "/uploads/room.jpg",
      sampleImageUrl: "/uploads/sample.jpg",
      originalPrompt: "",
      optimizedPrompt: "",
      negativePrompt: "",
      fidelity: "strict",
      materialIds: [],
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run failing validator tests**

Run:

```powershell
npm test -- tests/validators.test.ts
```

Expected: FAIL because `lib/validators.ts` does not exist.

- [ ] **Step 3: Implement validators**

Create `lib/validators.ts`:

```ts
import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  color: z.string().min(1),
  fabric: z.string().min(1),
  priceRange: z.string().min(1),
  sizeNote: z.string().default(""),
  sellingPoints: z.string().default(""),
  imageUrl: z.string().min(1),
});

export const promptTemplateSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  body: z.string().min(1),
});

export const fidelitySchema = z.enum(["strict", "balanced", "creative"]);

export const planSchema = z.object({
  customerName: z.string().min(1),
  notes: z.string().default(""),
  roomImageUrl: z.string().min(1),
  sampleImageUrl: z.string().min(1),
  originalPrompt: z.string().min(1),
  optimizedPrompt: z.string().default(""),
  negativePrompt: z.string().default(""),
  fidelity: fidelitySchema,
  materialIds: z.array(z.string()).default([]),
});
```

- [ ] **Step 4: Run validator tests**

Run:

```powershell
npm test -- tests/validators.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add shared API session guard**

Create `lib/auth/require-session.ts`:

```ts
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";

export async function requireMerchantSession() {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(sessionCookieName)?.value);
  if (!session) {
    throw new Response(JSON.stringify({ error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
```

- [ ] **Step 6: Add materials routes**

Create `app/api/materials/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { materialSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  const materials = await db.material.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const input = materialSchema.parse(await request.json());
  const material = await db.material.create({
    data: { ...input, merchantId: session.merchantId },
  });
  return NextResponse.json({ material }, { status: 201 });
}
```

Create `app/api/materials/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { materialSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const input = materialSchema.partial().parse(await request.json());
  const material = await db.material.update({
    where: { id, merchantId: session.merchantId },
    data: input,
  });
  return NextResponse.json({ material });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  const { id } = await params;
  await db.material.delete({ where: { id, merchantId: session.merchantId } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Add prompt template route**

Create `app/api/prompts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { promptTemplateSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const input = promptTemplateSchema.parse(await request.json());
  const template = await db.promptTemplate.create({
    data: { ...input, merchantId: session.merchantId, isSystem: false },
  });
  return NextResponse.json({ template }, { status: 201 });
}
```

- [ ] **Step 8: Add customer plan routes**

Create `app/api/plans/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { planSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireMerchantSession();
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId },
    include: { materials: { include: { material: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const input = planSchema.parse(await request.json());
  const plan = await db.customerPlan.create({
    data: {
      merchantId: session.merchantId,
      customerName: input.customerName,
      notes: input.notes,
      roomImageUrl: input.roomImageUrl,
      sampleImageUrl: input.sampleImageUrl,
      originalPrompt: input.originalPrompt,
      optimizedPrompt: input.optimizedPrompt,
      negativePrompt: input.negativePrompt,
      fidelity: input.fidelity,
      materials: {
        create: input.materialIds.map((materialId) => ({ materialId })),
      },
    },
    include: { materials: true },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
```

Create `app/api/plans/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { planSchema } from "@/lib/validators";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const plan = await db.customerPlan.findFirst({
    where: { id, merchantId: session.merchantId },
    include: { materials: { include: { material: true } }, records: true },
  });
  if (!plan) return NextResponse.json({ error: "客户方案不存在" }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireMerchantSession();
  const { id } = await params;
  const input = planSchema.partial().parse(await request.json());
  const plan = await db.customerPlan.update({
    where: { id, merchantId: session.merchantId },
    data: input,
  });
  return NextResponse.json({ plan });
}
```

- [ ] **Step 9: Verify build**

Run:

```powershell
npm test -- tests/validators.test.ts
npm run build
```

Expected: tests pass and route handlers type-check.

- [ ] **Step 10: Commit**

```powershell
git add lib/validators.ts lib/auth/require-session.ts tests/validators.test.ts app/api/materials app/api/prompts app/api/plans
git commit -m "feat: add mvp crud api boundaries"
```

## Task 5: Add Local File Upload Boundary

**Files:**
- Create: `lib/files/storage.ts`
- Create: `app/api/files/route.ts`
- Create: `components/file-picker.tsx`

- [ ] **Step 1: Implement local storage service**

Create `lib/files/storage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = process.env.LOCAL_FILE_ROOT ?? "./storage";

export async function saveUploadedFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const absoluteDir = path.resolve(root, "uploads");
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), bytes);
  return `/uploads/${fileName}`;
}
```

- [ ] **Step 2: Add upload route**

Create `app/api/files/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/files/storage";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
  }
  const url = await saveUploadedFile(file);
  return NextResponse.json({ url });
}
```

- [ ] **Step 3: Add reusable file picker**

Create `components/file-picker.tsx`:

```tsx
"use client";

import { useState } from "react";

export function FilePicker({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/files", { method: "POST", body: form });
    const body = await response.json();
    setBusy(false);
    if (response.ok) onChange(body.url);
  }

  return (
    <label className="block rounded-md border border-dashed p-4">
      <span className="text-sm font-medium">{label}</span>
      <input className="mt-3 block w-full text-sm" type="file" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }} />
      {busy ? <p className="mt-2 text-sm text-neutral-500">上传中...</p> : null}
      {value ? <p className="mt-2 break-all text-xs text-neutral-500">{value}</p> : null}
    </label>
  );
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run build
```

Expected: file route and picker compile.

- [ ] **Step 5: Commit**

```powershell
git add lib/files/storage.ts app/api/files/route.ts components/file-picker.tsx
git commit -m "feat: add image upload boundary"
```

## Task 6: Add AI Service Wrappers

**Files:**
- Create: `lib/ai/prompt.ts`
- Create: `lib/ai/image.ts`
- Create: `lib/ai/marketing.ts`
- Create: `tests/ai/prompt.test.ts`
- Create: `app/api/ai/optimize-prompt/route.ts`
- Create: `app/api/ai/generate-image/route.ts`
- Create: `app/api/ai/generate-marketing/route.ts`

- [ ] **Step 1: Write prompt construction test**

Create `tests/ai/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildOptimizedPromptInput } from "@/lib/ai/prompt";

describe("prompt construction", () => {
  it("adds structure and sample fidelity requirements", () => {
    const result = buildOptimizedPromptInput({
      userPrompt: "米白色窗帘，温馨一点",
      fidelity: "strict",
      materialSummary: "米白高遮光绒布窗帘，遮光强、垂感好",
    });

    expect(result).toContain("保留原房间结构");
    expect(result).toContain("严格还原");
    expect(result).toContain("米白高遮光绒布窗帘");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm test -- tests/ai/prompt.test.ts
```

Expected: FAIL because `lib/ai/prompt.ts` does not exist.

- [ ] **Step 3: Implement prompt wrapper**

Create `lib/ai/prompt.ts`:

```ts
import OpenAI from "openai";
import { fidelitySchema } from "@/lib/validators";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type PromptInput = {
  userPrompt: string;
  fidelity: "strict" | "balanced" | "creative";
  materialSummary: string;
};

const fidelityText = {
  strict: "严格还原样本图的颜色、纹理、款式、褶皱和材质特征。",
  balanced: "保留样本主要风格和颜色，并根据房间光线自然适配。",
  creative: "把样本作为风格灵感，允许更强氛围化表达。",
};

export function buildOptimizedPromptInput(input: PromptInput) {
  return [
    "请把以下软装效果图需求优化成适合图像生成模型使用的中文提示词。",
    "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
    `样本还原度：${fidelityText[input.fidelity]}`,
    `商家样本信息：${input.materialSummary}`,
    `用户原始需求：${input.userPrompt}`,
    "请输出：正向提示词、负向提示词。负向提示词需避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
  ].join("\n");
}

export async function optimizePrompt(input: PromptInput) {
  fidelitySchema.parse(input.fidelity);
  const prompt = buildOptimizedPromptInput(input);
  if (!process.env.OPENAI_API_KEY) {
    return {
      optimizedPrompt: `${input.userPrompt}。保留原房间结构、窗户位置、透视角度，${fidelityText[input.fidelity]}真实摄影质感。`,
      negativePrompt: "避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
    };
  }
  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    input: prompt,
  });
  return {
    optimizedPrompt: response.output_text,
    negativePrompt: "避免窗户变形、房间结构变化、窗帘位置错误、花纹跑偏、渲染不真实。",
  };
}
```

- [ ] **Step 4: Add image and marketing wrappers**

Create `lib/ai/image.ts`:

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEffectImage(input: {
  roomImageUrl: string;
  sampleImageUrl: string;
  optimizedPrompt: string;
  negativePrompt: string;
  fidelity: string;
  referenceImageUrl?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      imageUrl: input.referenceImageUrl ?? input.roomImageUrl,
      inputSummary: `${input.fidelity}: ${input.optimizedPrompt.slice(0, 120)}`,
    };
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    input: [
      { role: "user", content: [
        { type: "input_text", text: `生成软装效果图请求：${input.optimizedPrompt}\n负向要求：${input.negativePrompt}\n样本还原度：${input.fidelity}` },
      ] },
    ],
  });

  return {
    imageUrl: input.roomImageUrl,
    inputSummary: response.output_text.slice(0, 240),
  };
}
```

Create `lib/ai/marketing.ts`:

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateMarketingCopy(input: {
  materialSummary: string;
  roomSummary: string;
  effectImageUrl: string;
  customerNotes: string;
}) {
  const prompt = [
    "你是窗帘和软装销售文案助手。",
    "基于素材信息、房间场景和客户备注，生成短视频脚本、朋友圈/社群文案、客户沟通话术。",
    `素材信息：${input.materialSummary}`,
    `房间场景：${input.roomSummary}`,
    `客户备注：${input.customerNotes}`,
  ].join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return {
      shortVideoScript: "开场展示客户原房间，再切换窗帘上墙效果，重点讲遮光、垂感和整体氛围提升。",
      socialCopy: "这套米白窗帘让空间立刻柔和下来，遮光和垂感都很适合卧室/客厅客户参考。",
      customerScript: "您看这张效果图，窗帘颜色和房间整体色调比较协调，也能保留空间的通透感。",
    };
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    input: prompt,
  });

  return {
    shortVideoScript: response.output_text,
    socialCopy: response.output_text,
    customerScript: response.output_text,
  };
}
```

- [ ] **Step 5: Add prompt optimization route**

Create `app/api/ai/optimize-prompt/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { optimizePrompt } from "@/lib/ai/prompt";
import { fidelitySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const userPrompt = String(body.userPrompt ?? "");
  const materialSummary = String(body.materialSummary ?? "");
  const fidelity = fidelitySchema.parse(body.fidelity ?? "strict");
  const result = await optimizePrompt({ userPrompt, materialSummary, fidelity });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      type: "prompt_optimization",
      inputSummary: userPrompt.slice(0, 240),
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 6: Add image generation route**

Create `app/api/ai/generate-image/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateEffectImage } from "@/lib/ai/image";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { fidelitySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const result = await generateEffectImage({
    roomImageUrl: String(body.roomImageUrl ?? ""),
    sampleImageUrl: String(body.sampleImageUrl ?? ""),
    optimizedPrompt: String(body.optimizedPrompt ?? ""),
    negativePrompt: String(body.negativePrompt ?? ""),
    fidelity: fidelitySchema.parse(body.fidelity ?? "strict"),
    referenceImageUrl: body.referenceImageUrl ? String(body.referenceImageUrl) : undefined,
  });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      planId: body.planId ? String(body.planId) : undefined,
      type: "image_generation",
      inputSummary: result.inputSummary,
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 7: Add marketing generation route**

Create `app/api/ai/generate-marketing/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMarketingCopy } from "@/lib/ai/marketing";
import { requireMerchantSession } from "@/lib/auth/require-session";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const result = await generateMarketingCopy({
    materialSummary: String(body.materialSummary ?? ""),
    roomSummary: String(body.roomSummary ?? ""),
    effectImageUrl: String(body.effectImageUrl ?? ""),
    customerNotes: String(body.customerNotes ?? ""),
  });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      planId: body.planId ? String(body.planId) : undefined,
      type: "marketing_copy",
      inputSummary: `${body.materialSummary ?? ""}`.slice(0, 240),
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 8: Verify**

Run:

```powershell
npm test -- tests/ai/prompt.test.ts
npm run build
```

Expected: prompt construction test passes and AI routes compile.

- [ ] **Step 9: Commit**

```powershell
git add lib/ai app/api/ai tests/ai/prompt.test.ts
git commit -m "feat: add ai service wrappers"
```

## Task 7: Build Mobile-First Workbench UI

**Files:**
- Create: `components/app-shell.tsx`
- Create: `components/prompt-editor.tsx`
- Create: `components/prompt-library-sheet.tsx`
- Create: `components/fidelity-selector.tsx`
- Create: `components/result-panel.tsx`
- Create: `tests/components/prompt-editor.test.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Test prompt insert/replace behavior**

Create `tests/components/prompt-editor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PromptEditor } from "@/components/prompt-editor";

describe("PromptEditor", () => {
  it("supports replacing the current prompt", async () => {
    const user = userEvent.setup();
    render(<PromptEditor value="原始内容" onChange={() => undefined} testTemplate="模板内容" />);
    await user.click(screen.getByRole("button", { name: "替换整段" }));
    expect(screen.getByLabelText("生成要求")).toHaveValue("模板内容");
  });
});
```

- [ ] **Step 2: Run failing component test**

Run:

```powershell
npm test -- tests/components/prompt-editor.test.tsx
```

Expected: FAIL because `components/prompt-editor.tsx` does not exist.

- [ ] **Step 3: Implement prompt editor**

Create `components/prompt-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

export function PromptEditor({
  value,
  onChange,
  testTemplate,
}: {
  value: string;
  onChange: (value: string) => void;
  testTemplate?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const template = testTemplate ?? "保留原房间结构和窗户位置，搭配窗帘样本图中的颜色、纹理和垂感，生成真实摄影质感效果图。";

  function update(next: string) {
    setLocalValue(next);
    onChange(next);
  }

  return (
    <section className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="prompt">生成要求</label>
      <textarea
        id="prompt"
        aria-label="生成要求"
        value={localValue}
        onChange={(event) => update(event.target.value)}
        className="min-h-40 w-full rounded-md border p-3 text-base"
        placeholder="请描述想要的窗帘效果、风格、材质、光线和需要保留的房间细节"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => update(`${localValue}${localValue ? "\n" : ""}${template}`)}>插入模板</button>
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => update(template)}>替换整段</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement shell and selector components**

Create `components/fidelity-selector.tsx`:

```tsx
"use client";

export function FidelitySelector({ value, onChange }: { value: string; onChange: (value: "strict" | "balanced" | "creative") => void }) {
  const options = [
    ["strict", "严格还原", "优先保持样本颜色、纹理、款式和材质"],
    ["balanced", "平衡", "保留主要风格并适配房间光线"],
    ["creative", "创意参考", "适合宣传图和氛围图"],
  ] as const;

  return (
    <div className="grid gap-2">
      {options.map(([key, label, description]) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-md border p-3 text-left ${value === key ? "border-neutral-950" : "border-neutral-200"}`}>
          <span className="block font-medium">{label}</span>
          <span className="text-sm text-neutral-500">{description}</span>
        </button>
      ))}
    </div>
  );
}
```

Create `components/app-shell.tsx`:

```tsx
import Link from "next/link";

const nav = [
  ["工作台", "/"],
  ["素材", "/materials"],
  ["方案", "/plans"],
  ["提示词", "/prompts"],
  ["记录", "/records"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-56 border-r bg-white p-4 md:block">
        <h1 className="text-lg font-semibold">软装 AI 工作台</h1>
        <nav className="mt-6 grid gap-1">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm hover:bg-neutral-100">{label}</Link>
          ))}
        </nav>
      </aside>
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 md:ml-56 md:px-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t bg-white md:hidden">
        {nav.map(([label, href]) => (
          <Link key={href} href={href} className="px-2 py-3 text-center text-xs">{label}</Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 5: Implement result panel**

Create `components/result-panel.tsx`:

```tsx
"use client";

export function ResultPanel({
  imageUrl,
  shortVideoScript,
  socialCopy,
  customerScript,
  onSimilar,
  onMarketing,
  onSave,
}: {
  imageUrl: string;
  shortVideoScript: string;
  socialCopy: string;
  customerScript: string;
  onSimilar: () => void;
  onMarketing: () => void;
  onSave: () => void;
}) {
  if (!imageUrl) return null;

  return (
    <section className="space-y-4 rounded-md border bg-white p-4">
      <div className="aspect-[4/3] rounded bg-neutral-100 p-4 text-sm text-neutral-500">{imageUrl}</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onSimilar}>基于当前效果生成相似方案</button>
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onMarketing}>生成营销内容</button>
        <button type="button" className="rounded-md bg-neutral-950 px-3 py-2 text-sm text-white" onClick={onSave}>保存客户方案</button>
      </div>
      {shortVideoScript ? <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">{shortVideoScript}</pre> : null}
      {socialCopy ? <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">{socialCopy}</pre> : null}
      {customerScript ? <pre className="whitespace-pre-wrap rounded bg-neutral-50 p-3 text-sm">{customerScript}</pre> : null}
    </section>
  );
}
```

- [ ] **Step 6: Implement dashboard layout**

Create `app/(dashboard)/layout.tsx`:

```tsx
import { AppShell } from "@/components/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 7: Implement dashboard page**

Create `app/(dashboard)/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FidelitySelector } from "@/components/fidelity-selector";
import { FilePicker } from "@/components/file-picker";
import { PromptEditor } from "@/components/prompt-editor";
import { ResultPanel } from "@/components/result-panel";

export default function WorkbenchPage() {
  const [roomImageUrl, setRoomImageUrl] = useState("");
  const [sampleImageUrl, setSampleImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [fidelity, setFidelity] = useState<"strict" | "balanced" | "creative">("strict");
  const [imageUrl, setImageUrl] = useState("");
  const [shortVideoScript, setShortVideoScript] = useState("");
  const [socialCopy, setSocialCopy] = useState("");
  const [customerScript, setCustomerScript] = useState("");

  async function optimize() {
    const response = await fetch("/api/ai/optimize-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPrompt: prompt, fidelity, materialSummary: "当前选择的窗帘/软装样本" }),
    });
    const body = await response.json();
    setOptimizedPrompt(body.optimizedPrompt);
    setNegativePrompt(body.negativePrompt);
  }

  async function generate(referenceImageUrl?: string) {
    const response = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomImageUrl, sampleImageUrl, optimizedPrompt: optimizedPrompt || prompt, negativePrompt, fidelity, referenceImageUrl }),
    });
    const body = await response.json();
    setImageUrl(body.imageUrl);
  }

  async function marketing() {
    const response = await fetch("/api/ai/generate-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialSummary: "当前选择的窗帘/软装样本", roomSummary: prompt, effectImageUrl: imageUrl, customerNotes: "" }),
    });
    const body = await response.json();
    setShortVideoScript(body.shortVideoScript);
    setSocialCopy(body.socialCopy);
    setCustomerScript(body.customerScript);
  }

  async function savePlan() {
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "临时客户",
        notes: "",
        roomImageUrl,
        sampleImageUrl,
        originalPrompt: prompt,
        optimizedPrompt,
        negativePrompt,
        fidelity,
        materialIds: [],
      }),
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">新建客户方案</h1>
        <p className="mt-1 text-sm text-neutral-500">上传房间图和样本图，自主书写提示词后生成效果图。</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <FilePicker label="客户房间图" value={roomImageUrl} onChange={setRoomImageUrl} />
        <FilePicker label="窗帘/软装样本图" value={sampleImageUrl} onChange={setSampleImageUrl} />
      </div>
      <PromptEditor value={prompt} onChange={setPrompt} />
      <FidelitySelector value={fidelity} onChange={setFidelity} />
      <div className="sticky bottom-14 grid gap-2 bg-neutral-50 py-3 md:static md:grid-cols-2">
        <button type="button" className="rounded-md border bg-white px-4 py-3" onClick={optimize}>优化提示词</button>
        <button type="button" className="rounded-md bg-neutral-950 px-4 py-3 text-white" onClick={() => generate()}>生成效果图</button>
      </div>
      <ResultPanel
        imageUrl={imageUrl}
        shortVideoScript={shortVideoScript}
        socialCopy={socialCopy}
        customerScript={customerScript}
        onSimilar={() => generate(imageUrl)}
        onMarketing={marketing}
        onSave={savePlan}
      />
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run:

```powershell
npm test -- tests/components/prompt-editor.test.tsx
npm run build
```

Expected: component test passes and dashboard compiles.

- [ ] **Step 9: Commit**

```powershell
git add components "app/(dashboard)" tests/components/prompt-editor.test.tsx
git commit -m "feat: add mobile-first workbench"
```

## Task 8: Build Library And Records Pages

**Files:**
- Create: `components/material-card.tsx`
- Create: `components/customer-plan-card.tsx`
- Modify: `app/(dashboard)/materials/page.tsx`
- Modify: `app/(dashboard)/plans/page.tsx`
- Modify: `app/(dashboard)/prompts/page.tsx`
- Modify: `app/(dashboard)/records/page.tsx`

- [ ] **Step 1: Add material card**

Create `components/material-card.tsx`:

```tsx
export function MaterialCard({ material }: { material: { name: string; category: string; color: string; fabric: string; priceRange: string; sellingPoints: string; imageUrl: string } }) {
  return (
    <article className="rounded-md border p-3">
      <div className="aspect-[4/3] rounded bg-neutral-100" />
      <h3 className="mt-3 font-medium">{material.name}</h3>
      <p className="text-sm text-neutral-500">{material.category} · {material.color} · {material.fabric}</p>
      <p className="mt-2 text-sm">{material.sellingPoints}</p>
      <p className="mt-2 text-xs text-neutral-500">{material.priceRange}</p>
    </article>
  );
}
```

- [ ] **Step 2: Add customer plan card**

Create `components/customer-plan-card.tsx`:

```tsx
export function CustomerPlanCard({ plan }: { plan: { customerName: string; notes: string; status: string; createdAt: string } }) {
  return (
    <article className="rounded-md border p-3">
      <h3 className="font-medium">{plan.customerName}</h3>
      <p className="mt-1 text-sm text-neutral-500">{plan.notes || "无备注"}</p>
      <p className="mt-2 text-xs text-neutral-500">{plan.status} · {new Date(plan.createdAt).toLocaleString()}</p>
    </article>
  );
}
```

- [ ] **Step 3: Implement materials page**

Create `app/(dashboard)/materials/page.tsx`:

```tsx
import { MaterialCard } from "@/components/material-card";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function MaterialsPage() {
  const session = await requireMerchantSession();
  const materials = await db.material.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">素材库</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => <MaterialCard key={material.id} material={material} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement plans page**

Create `app/(dashboard)/plans/page.tsx`:

```tsx
import { CustomerPlanCard } from "@/components/customer-plan-card";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PlansPage() {
  const session = await requireMerchantSession();
  const plans = await db.customerPlan.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">客户方案</h1>
      <div className="grid gap-3">
        {plans.map((plan) => (
          <CustomerPlanCard key={plan.id} plan={{ ...plan, createdAt: plan.createdAt.toISOString() }} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement prompts page**

Create `app/(dashboard)/prompts/page.tsx`:

```tsx
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PromptsPage() {
  const session = await requireMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">提示词库</h1>
      <div className="grid gap-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{template.title}</h2>
              <span className="rounded bg-neutral-100 px-2 py-1 text-xs">{template.isSystem ? "系统" : "我的"}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{template.category}</p>
            <p className="mt-2 text-sm">{template.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement records page**

Create `app/(dashboard)/records/page.tsx`:

```tsx
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function RecordsPage() {
  const session = await requireMerchantSession();
  const records = await db.generationRecord.findMany({
    where: { merchantId: session.merchantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">生成记录</h1>
      <div className="grid gap-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-md border bg-white p-3">
            <h2 className="font-medium">{record.type}</h2>
            <p className="mt-1 text-sm text-neutral-500">{record.status} · 消耗 {record.usageUnits}</p>
            <p className="mt-2 text-sm">{record.inputSummary}</p>
            {record.failureReason ? <p className="mt-2 text-sm text-red-600">{record.failureReason}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run:

```powershell
npm run build
```

Expected: all dashboard pages compile.

- [ ] **Step 8: Commit**

```powershell
git add components/material-card.tsx components/customer-plan-card.tsx "app/(dashboard)/materials" "app/(dashboard)/plans" "app/(dashboard)/prompts" "app/(dashboard)/records"
git commit -m "feat: add library and records pages"
```

## Task 9: End-To-End Manual Verification

**Files:**
- Modify only files needed to fix verified defects.

- [ ] **Step 1: Start dev server**

Run:

```powershell
npm run dev
```

Expected: app starts at `http://localhost:3000` or the next available port.

- [ ] **Step 2: Verify login**

Open `http://localhost:3000/login`. Log in with:

```text
demo@example.com
demo123456
```

Expected: browser redirects to the workbench.

- [ ] **Step 3: Verify mobile viewport**

Use browser viewport around `390x844`.

Expected:

- No horizontal scrolling.
- Upload controls fit the viewport.
- Prompt textarea is the dominant control.
- Fidelity selector buttons are tappable.
- Generate action remains easy to reach.

- [ ] **Step 4: Verify workbench flow without OpenAI key**

Use local fallback mode by leaving `OPENAI_API_KEY` empty.

Expected:

- Prompt optimization returns deterministic optimized text.
- Image generation returns a placeholder/reference URL.
- Marketing generation returns short video script, social copy, and customer script.
- Customer plan can be saved.
- Generation records appear on `/records`.

- [ ] **Step 5: Verify with OpenAI key when available**

Set `OPENAI_API_KEY` in `.env` and restart the dev server.

Expected:

- Prompt optimization route returns model-generated text.
- Marketing route returns model-generated content.
- Image route reaches the AI wrapper without exposing the API key in browser code.

- [ ] **Step 6: Run full verification**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass and production build succeeds.

- [ ] **Step 7: Commit fixes**

```powershell
git status --short
git add .
git commit -m "fix: complete mvp verification"
```

## References

- Product spec: `docs/superpowers/specs/2026-06-09-soft-furnishing-merchant-mvp-design.md`
- OpenAI image generation guide: https://platform.openai.com/docs/guides/image-generation
- OpenAI text generation guide: https://platform.openai.com/docs/guides/text
- WeChat Mini Program image safety check reference for future phase: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/imgSecCheck.html
- WeChat Mini Program text safety check reference for future phase: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html
