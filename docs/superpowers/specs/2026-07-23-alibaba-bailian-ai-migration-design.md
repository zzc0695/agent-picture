# Alibaba Bailian AI migration design

## Goal

Move every AI capability in the soft-furnishing merchant MVP from OpenAI to Alibaba Cloud Bailian while retaining the existing API routes, user flow, and Vercel Blob persistence.

## Scope

- Prompt optimization uses the Qwen text model through Bailian's OpenAI-compatible Chat Completions endpoint.
- Marketing-copy generation uses the same Qwen text client.
- Effect-image generation uses Bailian's native multimodal generation endpoint so that room and material reference images are supplied as actual image inputs.
- Generated temporary image URLs are downloaded server-side and saved through the existing `saveGeneratedImage` helper.

## Configuration

The runtime will use these variables:

- `DASHSCOPE_API_KEY` (required for real AI generation, sensitive)
- `DASHSCOPE_TEXT_MODEL` (optional; default `qwen3.7-plus`)
- `DASHSCOPE_IMAGE_MODEL` (optional; default `wan2.7-image-pro`)
- `BLOB_READ_WRITE_TOKEN` (required in Vercel to persist uploaded and generated images)

Legacy `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, and `OPENAI_IMAGE_MODEL` are not read by the migrated implementation. If `DASHSCOPE_API_KEY` is absent, the existing deterministic demo fallbacks remain available.

## Architecture

Create a shared Bailian helper that owns environment lookup, the OpenAI-compatible text client, and response-content extraction. Both text features call Chat Completions at `https://dashscope.aliyuncs.com/compatible-mode/v1`; they no longer use the OpenAI Responses API.

Image generation calls `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` with `wan2.7-image-pro` by default. Its user message contains the room image, material sample, and optional current effect image followed by the prompt text. `wan2.7-image-pro` is selected because this product is based on multi-reference room editing.

Reference handling is explicit:

- Public HTTP(S) URLs, including Vercel Blob URLs, are passed through unchanged.
- Locally stored `/uploads/<file>` references are read and converted into `data:<mime>;base64,...` values.
- Static files under `public/` are converted in the same way, so seeded sample data also works locally.

The result image URL returned by Bailian is fetched immediately and passed to `saveGeneratedImage`. The browser receives only the durable Blob/local URL that it receives today.

## Errors and testing

- A non-OK Bailian response includes its provider error code/message in a safe server error.
- Missing or malformed returned image URLs fail loudly rather than creating a broken generation record.
- Tests cover environment defaults, fallback behavior, Chat Completion extraction, image-response extraction, reference conversion routing, and provider failure handling.
- The existing test suite and production build must pass before deployment.

## Deployment

After code is deployed, add `DASHSCOPE_API_KEY` to Vercel Preview (and Production when that is promoted). Keep the key sensitive. Add the optional model variables only when overriding the defaults. Confirm `BLOB_READ_WRITE_TOKEN` remains present, then trigger a Preview deployment and test prompt optimization, effect image generation, and marketing copy while logged in.
