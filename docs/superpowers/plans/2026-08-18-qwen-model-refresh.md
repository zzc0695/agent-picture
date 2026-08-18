# Qwen Model Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use `qwen3.7-flash` for text generation and `qwen-image-3.0` for multi-reference effect-image editing, then deploy and verify both providers with a real Vercel Preview secret.

**Architecture:** Keep the existing Bailian adapter boundary. Text stays on the OpenAI-compatible Chat Completions endpoint with thinking explicitly disabled; image editing stays on the synchronous native multimodal endpoint with Qwen Image parameters and the existing durable-download flow.

**Tech Stack:** Next.js 16, TypeScript, OpenAI Node SDK, native `fetch`, Vitest, Vercel Preview, Vercel Blob, Alibaba Cloud Bailian.

---

## File map

- Modify `lib/ai/bailian.ts`: model defaults, Bailian text request extension, and Qwen Image request parameters.
- Modify `lib/ai/prompt.ts`: disable thinking for prompt optimization.
- Modify `lib/ai/marketing.ts`: disable thinking for marketing copy.
- Modify `lib/ai/image.ts`: separate negative instructions from the positive prompt and pass Qwen Image options.
- Modify `tests/ai/bailian.test.ts`: provider defaults and serialized Qwen Image request coverage.
- Modify `tests/ai/text.test.ts`: Flash model and non-thinking request coverage.
- Modify `tests/ai/image.test.ts`: Qwen Image model/options and reference ordering coverage.
- No secret-bearing local file is created or modified.

### Task 1: Refresh provider defaults

**Files:**
- Modify: `tests/ai/bailian.test.ts`
- Modify: `lib/ai/bailian.ts`

- [ ] **Step 1: Change the provider-default test to the selected models**

```ts
it("uses the selected Qwen defaults", () => {
  expect(getBailianConfig({ DASHSCOPE_API_KEY: "key" })).toMatchObject({
    apiKey: "key",
    textModel: "qwen3.7-flash",
    imageModel: "qwen-image-3.0",
  });
});
```

- [ ] **Step 2: Run the focused test and verify the old defaults fail**

Run: `npm test -- tests/ai/bailian.test.ts`

Expected: FAIL showing `qwen3.7-plus` and `wan2.7-image-pro` instead of the selected model IDs.

- [ ] **Step 3: Change only the default values while retaining environment overrides**

```ts
export function getBailianConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKey: env.DASHSCOPE_API_KEY,
    textModel: env.DASHSCOPE_TEXT_MODEL ?? "qwen3.7-flash",
    imageModel: env.DASHSCOPE_IMAGE_MODEL ?? "qwen-image-3.0",
  };
}
```

- [ ] **Step 4: Run the provider tests**

Run: `npm test -- tests/ai/bailian.test.ts`

Expected: all tests in `tests/ai/bailian.test.ts` PASS, including explicit environment overrides.

- [ ] **Step 5: Commit the defaults**

```powershell
git add -- lib/ai/bailian.ts tests/ai/bailian.test.ts
git commit -m "feat: select Qwen Flash and Image 3"
```

### Task 2: Make text generation non-thinking

**Files:**
- Modify: `tests/ai/text.test.ts`
- Modify: `lib/ai/prompt.ts`
- Modify: `lib/ai/marketing.ts`

- [ ] **Step 1: Update text mocks and assert the Bailian extension parameter**

Change the mocked config to:

```ts
getBailianConfig: () => ({
  apiKey: process.env.DASHSCOPE_API_KEY,
  textModel: "qwen3.7-flash",
  imageModel: "qwen-image-3.0",
}),
```

For both prompt optimization and marketing assertions, require:

```ts
expect(completionCreate).toHaveBeenCalledWith(
  expect.objectContaining({
    model: "qwen3.7-flash",
    enable_thinking: false,
  }),
);
```

- [ ] **Step 2: Run the text tests and verify they fail on the missing extension**

Run: `npm test -- tests/ai/text.test.ts`

Expected: FAIL because current calls do not include `enable_thinking: false`.

- [ ] **Step 3: Add the typed Bailian request extension in both text modules**

In `lib/ai/prompt.ts` and `lib/ai/marketing.ts`, add:

```ts
type BailianChatRequest = Parameters<
  ReturnType<typeof createBailianTextClient>["chat"]["completions"]["create"]
>[0] & { enable_thinking: boolean };
```

Build each request before calling the SDK:

```ts
const request: BailianChatRequest = {
  model: config.textModel,
  messages: [{ role: "user", content: prompt }],
  enable_thinking: false,
};
const response = await createBailianTextClient(
  config.apiKey,
).chat.completions.create(request);
```

- [ ] **Step 4: Run text tests and TypeScript production compilation**

Run: `npm test -- tests/ai/text.test.ts`

Expected: both text-generation tests PASS.

Run: `npm run build`

Expected: exit code 0, proving the request intersection is accepted by the installed OpenAI SDK types.

- [ ] **Step 5: Commit non-thinking text requests**

```powershell
git add -- lib/ai/prompt.ts lib/ai/marketing.ts tests/ai/text.test.ts
git commit -m "feat: use Qwen Flash without thinking"
```

### Task 3: Adapt effect-image requests to Qwen Image 3

**Files:**
- Modify: `tests/ai/bailian.test.ts`
- Modify: `tests/ai/image.test.ts`
- Modify: `lib/ai/bailian.ts`
- Modify: `lib/ai/image.ts`

- [ ] **Step 1: Add a request-serialization test for Qwen Image parameters**

```ts
it("sends Qwen Image editing parameters without exposing the key", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        output: {
          choices: [
            { message: { content: [{ image: "https://example.com/result.png" }] } },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  await generateBailianImage(
    "test-key",
    "qwen-image-3.0",
    [{ image: "https://example.com/room.png" }, { text: "替换窗帘" }],
    { negativePrompt: "避免改变房间结构" },
  );

  const [, request] = fetchMock.mock.calls[0];
  const body = JSON.parse(String(request.body));
  expect(body).toMatchObject({
    model: "qwen-image-3.0",
    parameters: {
      size: "1024*1024",
      n: 1,
      negative_prompt: "避免改变房间结构",
      prompt_extend: true,
      watermark: false,
    },
  });
});
```

Add `generateBailianImage` and Vitest mock helpers to the imports.

- [ ] **Step 2: Update the image orchestration test to require Qwen options and ordered references**

Use the new mocked configuration:

```ts
getBailianConfig: () => ({
  apiKey: process.env.DASHSCOPE_API_KEY,
  imageModel: "qwen-image-3.0",
  textModel: "qwen3.7-flash",
}),
```

Require the exact call shape:

```ts
expect(generateBailianImage).toHaveBeenCalledWith(
  "test-key",
  "qwen-image-3.0",
  [
    { image: "data:image/jpeg;base64,/uploads/room.jpg" },
    { image: "data:image/jpeg;base64,/uploads/sample.jpg" },
    expect.objectContaining({
      text: expect.stringContaining("图1是原房间，图2是材质样本"),
    }),
  ],
  { negativePrompt: "避免窗户变形" },
);
```

- [ ] **Step 3: Run the image tests and verify both new contracts fail**

Run: `npm test -- tests/ai/bailian.test.ts tests/ai/image.test.ts`

Expected: FAIL because the helper has no options argument, lacks Qwen parameters, and the image prompt does not identify image roles.

- [ ] **Step 4: Extend the native image helper with safe Qwen options**

Add:

```ts
export type BailianImageOptions = {
  negativePrompt?: string;
};
```

Change the function signature and request parameters:

```ts
export async function generateBailianImage(
  apiKey: string,
  model: string,
  content: BailianContentPart[],
  options: BailianImageOptions = {},
) {
  const response = await fetch(imageEndpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: { messages: [{ role: "user", content }] },
      parameters: {
        size: "1024*1024",
        n: 1,
        negative_prompt: options.negativePrompt || undefined,
        prompt_extend: true,
        watermark: false,
      },
    }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(providerErrorMessage(body, response.status));
  }
  return extractBailianImageUrl(body as BailianImageResponse);
}
```

- [ ] **Step 5: Separate positive and negative image instructions**

In `lib/ai/image.ts`, build the positive prompt without `负向要求`:

```ts
const imageRoleText = input.referenceImageUrl
  ? "图1是原房间，图2是材质样本，图3是当前效果参考。"
  : "图1是原房间，图2是材质样本。";
const prompt = [
  imageRoleText,
  "生成一张真实摄影质感的软装效果图。",
  "生成要求：" + input.optimizedPrompt,
  "样本还原度：" + input.fidelity,
  "必须保留原房间结构、窗户位置、透视角度和主要光线方向。",
].join("\n");
```

Pass the negative instruction separately:

```ts
const temporaryImageUrl = await generateBailianImage(
  config.apiKey,
  config.imageModel,
  content,
  { negativePrompt: input.negativePrompt },
);
```

- [ ] **Step 6: Run focused provider and image tests**

Run: `npm test -- tests/ai/bailian.test.ts tests/ai/image.test.ts tests/ai/text.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the Qwen Image adapter**

```powershell
git add -- lib/ai/bailian.ts lib/ai/image.ts tests/ai/bailian.test.ts tests/ai/image.test.ts
git commit -m "feat: adapt effect images to Qwen Image 3"
```

### Task 4: Validate and publish the Preview

**Files:**
- Verify only; no secret-bearing files.

- [ ] **Step 1: Confirm the secret was not written locally**

Run: `git status --short`

Expected: only intentional tracked changes, plus the pre-existing untracked `.codex-artifacts/`; no `.env*` file.

Run: `git diff --check HEAD~3..HEAD`

Expected: no whitespace errors.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 4: Push the feature branch**

Run: `git push origin codex/ai-studio-ui-replacement`

Expected: the remote branch advances to the final implementation commit and Vercel starts a new Preview deployment.

- [ ] **Step 5: Store only the secret in Vercel Preview**

Using the user's authenticated Vercel session, create or update `DASHSCOPE_API_KEY` with the user-supplied credential:

- Sensitive: enabled
- Environment: Preview only
- Branch: unscoped, unless Vercel requires selecting `codex/ai-studio-ui-replacement`

Do not print, inspect, screenshot, or persist the value anywhere else. Do not add model variables because the selected models are code defaults.

- [ ] **Step 6: Redeploy and inspect deployment status**

Redeploy the latest commit after the environment-variable update.

Expected: Vercel Preview reaches `READY`; build and runtime logs contain no `DASHSCOPE_API_KEY`, authentication failure, unsupported-model error, or invalid-parameter error.

- [ ] **Step 7: Perform signed-in live tests**

Use the existing demo merchant account in Preview and verify:

1. Prompt optimization returns non-demo text from `qwen3.7-flash`.
2. Marketing generation returns non-demo copy.
3. Effect-image generation accepts the room and material references, returns a new image, and the returned URL is a durable Blob URL rather than the temporary Bailian URL.
4. The generation record is saved successfully.

Expected: all three AI actions succeed without 4xx/5xx responses.

- [ ] **Step 8: Rotate the exposed credential after the successful proof**

Ask the user to revoke the credential shared in chat and create a replacement. Replace only the Vercel `DASHSCOPE_API_KEY` value with the new credential and redeploy once more.

Expected: the replacement Preview remains `READY` and a final prompt-optimization smoke test succeeds.
