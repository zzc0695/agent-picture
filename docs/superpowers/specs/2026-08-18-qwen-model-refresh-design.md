# Qwen model refresh design

## Goal

Update the existing Alibaba Cloud Bailian integration to use `qwen3.7-flash` for prompt optimization and marketing copy, and `qwen-image-3.0` for effect-image generation and editing. Keep the current routes, UI, demo fallback, and durable image persistence unchanged.

## Configuration and secret handling

- `DASHSCOPE_API_KEY` remains the only required AI secret and is stored only as a sensitive Vercel environment variable.
- The API key must not be written to the repository, local environment files, test fixtures, logs, or documentation.
- `DASHSCOPE_TEXT_MODEL` and `DASHSCOPE_IMAGE_MODEL` remain optional overrides.
- The new defaults are `qwen3.7-flash` and `qwen-image-3.0`.
- No model selector is added to the product UI.

## Text requests

Prompt optimization and marketing copy continue to use Bailian's OpenAI-compatible Chat Completions endpoint. Requests explicitly disable thinking mode because these are short, latency-sensitive generation tasks and the application consumes only the final `message.content`.

## Image requests

Effect-image generation continues to use Bailian's native synchronous multimodal generation endpoint. The request contains, in order:

1. the room image;
2. the material sample image;
3. the optional current effect image;
4. one text instruction that identifies the image roles.

This stays within `qwen-image-3.0`'s one-to-three input-image limit. The positive instruction remains in `input.messages[].content[].text`; the existing negative instruction is sent through `parameters.negative_prompt`. The request generates one image, uses a supported 1:1 size, disables watermarking, and does not use the text-to-image-only `agent` prompt-extension mode.

The returned temporary URL is downloaded immediately and persisted through the existing Blob/local storage helper.

## Errors and verification

- Provider errors remain server-side errors with the provider code and message, without request headers or secrets.
- Unit tests cover the new default model IDs, disabled text thinking mode, Qwen Image parameters, response parsing, and demo fallback.
- Run the full test suite and production build before pushing.
- Configure the secret in Vercel Preview, deploy the new commit, and perform real signed-in tests for prompt optimization, marketing copy, and effect-image generation.
- After successful testing, rotate the API key because the original credential was shared through chat, then replace the Vercel value and redeploy once more.
