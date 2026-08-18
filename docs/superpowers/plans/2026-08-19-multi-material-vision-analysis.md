# Multi-material Vision Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support fixed room, overall curtain style, and material detail uploads, analyze all three with Qwen3.7 Flash into an editable draft prompt, and use the two material references throughout generation and plan persistence.

**Architecture:** Add a focused multimodal analysis module and authenticated API route, extend the generation contract from one material image to two role-specific images, and add backward-compatible nullable columns to `CustomerPlan`. Keep upload mechanics in the workbench while splitting recognition and image-generation concerns at the server boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, OpenAI-compatible Alibaba Bailian API, Qwen3.7 Flash, Qwen Image 3.0, Prisma 7/PostgreSQL, Vitest, Testing Library.

---

## File structure

- Create `lib/ai/material-analysis.ts`: build and execute the three-image structured analysis request.
- Create `app/api/ai/analyze-materials/route.ts`: authenticate, validate, record usage, and return analysis.
- Create `tests/ai/material-analysis.test.ts`: request construction, response parsing, and fallback coverage.
- Create `prisma/migrations/20260819090000_add_material_reference_images/migration.sql`: non-destructive plan columns.
- Modify `lib/validators.ts`: analysis, generation, and plan request schemas.
- Modify `lib/ai/image.ts`: accept two role-specific material images and preserve the three-image provider limit.
- Modify `app/api/ai/generate-image/route.ts`: validate and forward the new image contract.
- Modify `app/api/plans/route.ts` and `app/api/plans/[id]/route.ts`: persist new fields while retaining the legacy fallback.
- Modify `app/(dashboard)/page.tsx`: three upload slots, removal/replacement, analysis state, editable generated prompt, and new generation payloads.
- Modify existing API, AI, component, validator, and plan tests for regression coverage.

### Task 1: Define analysis and persistence contracts

**Files:**
- Modify: `lib/validators.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260819090000_add_material_reference_images/migration.sql`
- Test: `tests/validators.test.ts`

- [ ] **Step 1: Write failing validator tests**

Add assertions that an analysis request requires all three URLs and that a plan accepts `styleImageUrl`, `detailImageUrl`, and a JSON `imageAnalysis` string while preserving `sampleImageUrl`.

```ts
expect(
  materialAnalysisRequestSchema.parse({
    roomImageUrl: "/uploads/room.jpg",
    styleImageUrl: "/uploads/style.jpg",
    detailImageUrl: "/uploads/detail.jpg",
  }),
).toMatchObject({ detailImageUrl: "/uploads/detail.jpg" });
```

- [ ] **Step 2: Run the validator test and verify failure**

Run: `npm test -- tests/validators.test.ts`

Expected: FAIL because `materialAnalysisRequestSchema` and new plan fields do not exist.

- [ ] **Step 3: Add schemas and database columns**

Add:

```ts
export const materialAnalysisRequestSchema = z.object({
  roomImageUrl: z.string().min(1),
  styleImageUrl: z.string().min(1),
  detailImageUrl: z.string().min(1),
});

export const materialAnalysisResultSchema = z.object({
  roomSummary: z.string().min(1),
  styleSummary: z.string().min(1),
  materialSummary: z.string().min(1),
  templatePrompt: z.string().min(1),
});
```

Extend `planSchema` with non-empty `styleImageUrl`, `detailImageUrl`, and defaulted `imageAnalysis`. Add nullable `styleImageUrl` and `detailImageUrl` plus defaulted `imageAnalysis` to `CustomerPlan`. The SQL migration uses `ADD COLUMN` only, leaving historical rows intact.

- [ ] **Step 4: Generate Prisma client and rerun tests**

Run: `npm run prisma:generate && npm test -- tests/validators.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add lib/validators.ts prisma/schema.prisma prisma/migrations/20260819090000_add_material_reference_images/migration.sql tests/validators.test.ts
git commit -m "feat: define multi-material plan contract"
```

### Task 2: Add three-image visual analysis

**Files:**
- Create: `lib/ai/material-analysis.ts`
- Create: `app/api/ai/analyze-materials/route.ts`
- Create: `tests/ai/material-analysis.test.ts`
- Modify: `tests/api/ai-routes.test.ts`

- [ ] **Step 1: Write failing unit tests for structured analysis**

Cover fixed image ordering, `enable_thinking: false`, JSON response parsing through `materialAnalysisResultSchema`, and the no-key fallback. The expected ordered content is room, style, detail, then the instruction text.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/ai/material-analysis.test.ts tests/api/ai-routes.test.ts`

Expected: FAIL because the module and route do not exist.

- [ ] **Step 3: Implement `analyzeMaterials`**

Use the existing Bailian text client with multimodal message content:

```ts
const response = await createBailianTextClient(apiKey).chat.completions.create({
  model: config.textModel,
  messages: [{ role: "user", content }],
  response_format: { type: "json_object" },
  enable_thinking: false,
} as BailianVisionRequest);
```

The content array sends `image_url` parts for room, style, and detail in that order, followed by one text instruction demanding the four exact JSON keys. Parse the returned text with `JSON.parse` and validate with `materialAnalysisResultSchema`.

- [ ] **Step 4: Implement the authenticated route**

Validate the body using `materialAnalysisRequestSchema`, return 400 with `图片识别信息不完整` on failure, call `analyzeMaterials`, and write one `GenerationRecord` with type `material_analysis` only after success.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/ai/material-analysis.test.ts tests/api/ai-routes.test.ts`

Expected: PASS.

```bash
git add lib/ai/material-analysis.ts app/api/ai/analyze-materials/route.ts tests/ai/material-analysis.test.ts tests/api/ai-routes.test.ts
git commit -m "feat: analyze room and curtain references"
```

### Task 3: Use two material references in image generation

**Files:**
- Modify: `lib/ai/image.ts`
- Modify: `app/api/ai/generate-image/route.ts`
- Modify: `tests/ai/image.test.ts`
- Modify: `tests/api/ai-routes.test.ts`

- [ ] **Step 1: Write failing generation tests**

Assert initial generation sends room, style, and detail. Assert similar generation sends current effect, style, and detail and never sends four images.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/ai/image.test.ts tests/api/ai-routes.test.ts`

Expected: FAIL because generation still accepts one `sampleImageUrl`.

- [ ] **Step 3: Update the generation contract**

Replace `sampleImageUrl` with `styleImageUrl` and `detailImageUrl`. Build image inputs as:

```ts
const baseImageUrl = input.referenceImageUrl ?? input.roomImageUrl;
const content: BailianContentPart[] = [
  { image: await toBailianImageReference(baseImageUrl) },
  { image: await toBailianImageReference(input.styleImageUrl) },
  { image: await toBailianImageReference(input.detailImageUrl) },
];
```

Identify the role order in the prompt and include the structured analysis summary. Validate the route body before invoking the provider.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/ai/image.test.ts tests/api/ai-routes.test.ts`

Expected: PASS.

```bash
git add lib/ai/image.ts app/api/ai/generate-image/route.ts tests/ai/image.test.ts tests/api/ai-routes.test.ts
git commit -m "feat: generate with style and detail references"
```

### Task 4: Persist role-specific references with legacy compatibility

**Files:**
- Modify: `app/api/plans/route.ts`
- Modify: `app/api/plans/[id]/route.ts`
- Modify: `tests/api/plans.test.ts`

- [ ] **Step 1: Write failing plan API tests**

Create and patch plans with both new URLs and `imageAnalysis`. Assert `sampleImageUrl` equals the style URL on new creates and that historical GET results remain unchanged.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/api/plans.test.ts`

Expected: FAIL because the new fields are not persisted.

- [ ] **Step 3: Update create and patch mapping**

On create, write `styleImageUrl`, `detailImageUrl`, and `imageAnalysis`; set legacy `sampleImageUrl` from `styleImageUrl`. On patch, map the new fields explicitly and update `sampleImageUrl` whenever `styleImageUrl` changes.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/api/plans.test.ts`

Expected: PASS.

```bash
git add app/api/plans/route.ts app/api/plans/[id]/route.ts tests/api/plans.test.ts
git commit -m "feat: persist multi-material references"
```

### Task 5: Build the three-slot workbench flow

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `tests/components/workbench-page.test.tsx`

- [ ] **Step 1: Write failing workbench tests**

Upload room, style, and detail images through their labels. Verify independent previews and removal. Verify `AI 识别并生成文案` remains disabled until all three are present, posts their Blob URLs, inserts returned `templatePrompt`, and allows editing. Verify generate and save requests contain both material URLs and the serialized analysis.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/components/workbench-page.test.tsx`

Expected: FAIL because only one material slot exists and the analysis action is absent.

- [ ] **Step 3: Implement state and handlers**

Use separate `styleImageUrl` and `detailImageUrl` state, a nullable analysis result, and role-specific upload actions. Replacing or removing any image clears the analysis result without clearing editable prompt text. Add `analyzeMaterials()` to call the new route and, on success, set both the analysis result and prompt.

- [ ] **Step 4: Render fixed role cards**

Render one card each for `整体款式` and `材质细节`, with preview, replacement, and removal controls. Render the analysis action below the three slots, disabled while any upload is running, while analysis is running, or while a required URL is empty. Display retryable upload and analysis errors with `role="alert"`.

- [ ] **Step 5: Update downstream payloads**

Send `styleImageUrl`, `detailImageUrl`, and serialized summaries to prompt optimization, image generation, and plan save. For similar generation, keep the current effect URL as `referenceImageUrl`; the server selects it instead of the room image.

- [ ] **Step 6: Run component tests and commit**

Run: `npm test -- tests/components/workbench-page.test.tsx`

Expected: PASS.

```bash
git add app/(dashboard)/page.tsx tests/components/workbench-page.test.tsx
git commit -m "feat: add multi-material analysis workflow"
```

### Task 6: Full verification and deployment

**Files:**
- Verify all changed application, Prisma, test, and documentation files.

- [ ] **Step 1: Run static and automated checks**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, lint exits 0, Prisma migration and Next build succeed, and no whitespace errors are reported.

- [ ] **Step 2: Push feature and main**

```bash
git push origin codex/ai-studio-ui-replacement
git push origin codex/ai-studio-ui-replacement:main
```

- [ ] **Step 3: Verify Vercel deployment**

Wait for the production deployment for the final commit to reach `READY`. If it fails, inspect build logs and fix the failing migration, type, or build step before retrying.

- [ ] **Step 4: Perform signed-in production verification**

Upload a room photo, overall style photo, and material detail photo. Run AI analysis, confirm the generated prompt is editable, run AI polishing, generate an effect, and save the plan. Confirm Vercel runtime logs show 2xx responses for `/api/files`, `/api/ai/analyze-materials`, `/api/ai/optimize-prompt`, `/api/ai/generate-image`, and `/api/plans`.

- [ ] **Step 5: Record final evidence**

Report the production deployment ID, final commit, automated test totals, and each verified production route without exposing API keys, cookies, database URLs, or request bodies containing secrets.
