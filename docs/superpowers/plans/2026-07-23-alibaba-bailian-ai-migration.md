# Alibaba Bailian AI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Replace all OpenAI-backed AI features with Alibaba Bailian text and image generation while retaining demo fallbacks and durable image persistence.

**Architecture:** A small \`lib/ai/bailian.ts\` module owns DashScope configuration, the OpenAI-compatible Qwen text client, native image requests, and provider error parsing. Prompt and marketing modules consume its text API; effect-image conversion sends real image inputs, downloads the temporary result, and stores it through the existing helper.

**Tech Stack:** Next.js 16, TypeScript, OpenAI Node SDK, DashScope HTTP API, Vercel Blob, Vitest.

---

### Task 1: Add the shared Bailian provider module

**Files:**
- Create: \`lib/ai/bailian.ts\`
- Create: \`tests/ai/bailian.test.ts\`

- [ ] **Step 1: Write failing tests for configuration and response extraction**

\`\`\`ts
import { describe, expect, it } from "vitest";
import { extractBailianImageUrl, extractChatCompletionText, getBailianConfig } from "@/lib/ai/bailian";

describe("Bailian provider", () => {
  it("uses Qwen defaults", () => {
    expect(getBailianConfig({ DASHSCOPE_API_KEY: "key" })).toMatchObject({
      apiKey: "key", textModel: "qwen3.7-plus", imageModel: "wan2.7-image-pro",
    });
  });

  it("extracts provider content", () => {
    expect(extractChatCompletionText({ choices: [{ message: { content: "文案" } }] })).toBe("文案");
    expect(extractBailianImageUrl({ output: { choices: [{ message: { content: [{ image: "https://example.com/a.png" }] } }] } })).toBe("https://example.com/a.png");
  });
});
\`\`\`

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`npm test -- tests/ai/bailian.test.ts\`

Expected: FAIL because \`@/lib/ai/bailian\` does not exist.

- [ ] **Step 3: Implement configuration, text client, extraction, and image request**

\`\`\`ts
import OpenAI from "openai";

const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const imageEndpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

export function getBailianConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKey: env.DASHSCOPE_API_KEY,
    textModel: env.DASHSCOPE_TEXT_MODEL ?? "qwen3.7-plus",
    imageModel: env.DASHSCOPE_IMAGE_MODEL ?? "wan2.7-image-pro",
  };
}

export function createBailianTextClient(apiKey: string) {
  return new OpenAI({ apiKey, baseURL });
}

export function extractChatCompletionText(response: { choices?: Array<{ message?: { content?: string | null } }> }) {
  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("文本生成接口没有返回内容");
  return text;
}

export function extractBailianImageUrl(response: { output?: { choices?: Array<{ message?: { content?: Array<{ image?: string }> } }> } }) {
  const imageUrl = response.output?.choices?.[0]?.message?.content?.find((part) => part.image)?.image;
  if (!imageUrl) throw new Error("图片生成接口没有返回图片地址");
  return imageUrl;
}

export async function generateBailianImage(apiKey: string, model: string, content: Array<Record<string, string>>) {
  const response = await fetch(imageEndpoint, {
    method: "POST",
    headers: { Authorization: \`Bearer \${apiKey}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: { messages: [{ role: "user", content }] }, parameters: { size: "1024*1024" } }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(\`图片生成失败：\${body.code ?? response.status} \${body.message ?? ""}\`.trim());
  return extractBailianImageUrl(body);
}
\`\`\`

- [ ] **Step 4: Run the focused test to verify it passes**

Run: \`npm test -- tests/ai/bailian.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the provider module**

\`\`\`bash
git add lib/ai/bailian.ts tests/ai/bailian.test.ts
git commit -m "feat: add Bailian AI provider"
\`\`\`

### Task 2: Migrate prompt optimization and marketing copy to Qwen

**Files:**
- Modify: \`lib/ai/prompt.ts\`
- Modify: \`lib/ai/marketing.ts\`
- Modify: \`tests/ai/prompt.test.ts\`

- [ ] **Step 1: Write a failing Qwen Chat Completions test**

\`\`\`ts
it("uses Bailian when a DashScope key exists", async () => {
  process.env.DASHSCOPE_API_KEY = "test-key";
  const completion = vi.fn().mockResolvedValue({ choices: [{ message: { content: "优化后的提示词" } }] });
  vi.doMock("@/lib/ai/bailian", () => ({
    getBailianConfig: () => ({ apiKey: "test-key", textModel: "qwen3.7-plus" }),
    createBailianTextClient: () => ({ chat: { completions: { create: completion } } }),
    extractChatCompletionText: (value: { choices: [{ message: { content: string } }] }) => value.choices[0].message.content,
  }));
  const { optimizePrompt } = await import("@/lib/ai/prompt");
  await expect(optimizePrompt({ userPrompt: "米白窗帘", fidelity: "balanced", materialSummary: "绒布" })).resolves.toMatchObject({ optimizedPrompt: "优化后的提示词" });
  expect(completion).toHaveBeenCalledWith(expect.objectContaining({ model: "qwen3.7-plus" }));
});
\`\`\`

- [ ] **Step 2: Run the prompt test to verify it fails**

Run: \`npm test -- tests/ai/prompt.test.ts\`

Expected: FAIL because the code still calls OpenAI Responses API.

- [ ] **Step 3: Replace both text call sites with the shared client**

\`\`\`ts
const config = getBailianConfig();
if (!config.apiKey) return fallback;
const response = await createBailianTextClient(config.apiKey).chat.completions.create({
  model: config.textModel,
  messages: [{ role: "user", content: prompt }],
});
const text = extractChatCompletionText(response);
\`\`\`

Use this exact flow in both \`optimizePrompt\` and \`generateMarketingCopy\`, preserving their existing fallback objects and public return shapes.

- [ ] **Step 4: Run focused tests**

Run: \`npm test -- tests/ai/prompt.test.ts tests/ai/bailian.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the text migration**

\`\`\`bash
git add lib/ai/prompt.ts lib/ai/marketing.ts tests/ai/prompt.test.ts
git commit -m "feat: use Qwen for AI text generation"
\`\`\`

### Task 3: Convert local reference images into Bailian-compatible values

**Files:**
- Modify: \`lib/files/storage.ts\`
- Modify: \`tests/files/storage.test.ts\`

- [ ] **Step 1: Write a failing reference-conversion test**

\`\`\`ts
it("keeps public URLs and converts local uploads to data URLs", async () => {
  await expect(toBailianImageReference("https://blob.vercel-storage.com/room.png")).resolves.toBe("https://blob.vercel-storage.com/room.png");
  await expect(toBailianImageReference("/uploads/room.jpg")).resolves.toMatch(/^data:image\\/jpeg;base64,/);
});
\`\`\`

- [ ] **Step 2: Run storage tests to verify it fails**

Run: \`npm test -- tests/files/storage.test.ts\`

Expected: FAIL because \`toBailianImageReference\` does not exist.

- [ ] **Step 3: Add secure local and public-file conversion**

\`\`\`ts
export async function toBailianImageReference(imageUrl: string) {
  if (/^https?:\\/\\//i.test(imageUrl) || imageUrl.startsWith("data:image/")) return imageUrl;
  const upload = imageUrl.startsWith("/uploads/") ? await readStoredUpload(path.basename(imageUrl)) : null;
  const file = upload ?? await readPublicImage(imageUrl);
  if (!file) throw new Error("无法读取用于图片生成的参考图");
  return \`data:\${file.contentType};base64,\${file.bytes.toString("base64")}\`;
}
\`\`\`

Implement \`readPublicImage\` with \`path.resolve("public", imageUrl.replace(/^\\/+/, ""))\` and the same root-boundary check used by \`readStoredUpload\`.

- [ ] **Step 4: Run storage tests to verify they pass**

Run: \`npm test -- tests/files/storage.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit reference conversion**

\`\`\`bash
git add lib/files/storage.ts tests/files/storage.test.ts
git commit -m "feat: prepare image references for Bailian"
\`\`\`

### Task 4: Migrate effect-image generation and persistence

**Files:**
- Modify: \`lib/ai/image.ts\`
- Modify: \`tests/ai/image.test.ts\`

- [ ] **Step 1: Replace OpenAI image mocks with Bailian and download mocks**

\`\`\`ts
vi.mock("@/lib/ai/bailian", () => ({
  getBailianConfig: () => ({ apiKey: "test-key", imageModel: "wan2.7-image-pro" }),
  generateBailianImage: vi.fn().mockResolvedValue("https://temporary.example/image.png"),
}));
vi.mock("@/lib/files/storage", () => ({
  saveGeneratedImage: vi.fn(),
  toBailianImageReference: vi.fn((value: string) => Promise.resolve(\`data:image/jpeg;base64,\${value}\`)),
}));
\`\`\`

Assert that room/sample inputs precede the prompt, the temporary URL is fetched, and downloaded bytes are stored as a PNG.

- [ ] **Step 2: Run effect-image tests to verify they fail**

Run: \`npm test -- tests/ai/image.test.ts\`

Expected: FAIL because the module still calls \`client.images.generate\`.

- [ ] **Step 3: Implement native generation and durable download**

\`\`\`ts
const config = getBailianConfig();
if (!config.apiKey) return demoFallback;
const content = [
  { image: await toBailianImageReference(input.roomImageUrl) },
  { image: await toBailianImageReference(input.sampleImageUrl) },
  ...(input.referenceImageUrl ? [{ image: await toBailianImageReference(input.referenceImageUrl) }] : []),
  { text: prompt },
];
const temporaryUrl = await generateBailianImage(config.apiKey, config.imageModel, content);
const imageResponse = await fetch(temporaryUrl);
if (!imageResponse.ok) throw new Error("无法下载图片生成结果");
const imageUrl = await saveGeneratedImage(Buffer.from(await imageResponse.arrayBuffer()), "png");
\`\`\`

- [ ] **Step 4: Run focused AI and storage tests**

Run: \`npm test -- tests/ai/image.test.ts tests/files/storage.test.ts tests/ai/bailian.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the image migration**

\`\`\`bash
git add lib/ai/image.ts tests/ai/image.test.ts
git commit -m "feat: generate images with Bailian"
\`\`\`

### Task 5: Validate, document, and deploy

**Files:**
- Modify: \`README.md\` only if it documents legacy \`OPENAI_*\` variables.

- [ ] **Step 1: Remove user-facing references to obsolete environment variables**

Run: \`rg -n "OPENAI_(API_KEY|TEXT_MODEL|IMAGE_MODEL)" README.md app lib tests\`

Expected: no production-code matches. If README matches, replace them with \`DASHSCOPE_API_KEY\`, optional \`DASHSCOPE_TEXT_MODEL\`, optional \`DASHSCOPE_IMAGE_MODEL\`, and \`BLOB_READ_WRITE_TOKEN\`.

- [ ] **Step 2: Run the full test suite**

Run: \`npm test\`

Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run: \`npm run build\`

Expected: exit code 0.

- [ ] **Step 4: Commit any documentation update**

\`\`\`bash
git add README.md
git commit -m "docs: document Bailian AI configuration"
\`\`\`

Run this commit only if Step 1 changed README.

- [ ] **Step 5: Push and deploy the Preview build**

Run: \`git push origin codex/ai-studio-ui-replacement\`

Expected: successful push. Add \`DASHSCOPE_API_KEY\` as a sensitive Vercel Preview variable, confirm \`BLOB_READ_WRITE_TOKEN\` remains configured, then deploy and exercise prompt optimization, effect image generation, and marketing copy while signed in.
