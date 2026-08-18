# Multi-material vision analysis design

## Goal

Extend the workbench from one material sample image to two explicitly assigned
material references: an overall curtain style image and a material detail image.
After the room image and both material images are uploaded, the merchant can
explicitly ask AI to analyze all three images and create an editable draft prompt
before prompt polishing or effect-image generation.

## Product flow

The first workbench step contains three image slots:

1. Customer room image.
2. Overall curtain style image.
3. Material detail image.

Each slot supports upload, replacement, preview, and removal. Uploads remain
independent: an error in one slot does not remove or reset either of the other
images.

The `AI 识别并生成文案` action is enabled only when all three images have been
uploaded successfully. It is an explicit action rather than an automatic upload
side effect, preventing repeated model calls while a merchant is still replacing
or comparing references.

After analysis, the generated `templatePrompt` populates the existing editable
`生成要求` field. The merchant may edit it directly, add inspiration tags, or run
the existing `AI 润色` action before generating the effect image.

## Visual analysis API

Add `POST /api/ai/analyze-materials`. The authenticated request contains:

- `roomImageUrl`
- `styleImageUrl`
- `detailImageUrl`

The route validates that all three values are non-empty image references and calls
the configured `qwen3.7-flash` model through the existing server-side Bailian
client. The API key remains server-only.

The model receives the images in a fixed order and is instructed to return a
structured result:

```json
{
  "roomSummary": "房间类型、布局、窗户结构、光线与主色调",
  "styleSummary": "窗帘整体款式、层次、褶皱、轨道与配色",
  "materialSummary": "面料颜色、纹理、厚度、遮光感与白纱特征",
  "templatePrompt": "可直接编辑并用于后续效果图生成的中文模板文案"
}
```

The server validates the model response before returning it. Invalid or incomplete
model output is treated as an analysis failure rather than being inserted into the
prompt editor.

Qwen3.7 Flash supports image input and structured output, so this feature reuses
the existing text model and API key instead of introducing a second recognition
model. Reference: [Alibaba Cloud visual understanding](https://help.aliyun.com/zh/model-studio/vision-model).

## Effect-image generation

The initial effect-image request contains exactly three input images, in order:

1. Original room image.
2. Overall curtain style image.
3. Material detail image.

The text instruction names the role of each image and includes the analyzed
summaries plus the merchant-edited prompt.

For `生成相似方案`, the input images are:

1. Current effect image as the spatial and composition base.
2. Overall curtain style image.
3. Material detail image.

This preserves the two material references while staying within Qwen Image 3.0's
limit of one to three image inputs. Reference: [Alibaba Cloud Qwen Image 3.0 API](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference).

## Data model and compatibility

New plans store explicit `styleImageUrl` and `detailImageUrl` values. The existing
`sampleImageUrl` field remains during this change for compatibility with existing
plans and existing consumers. New saves also populate `sampleImageUrl` with the
style image URL as the legacy fallback.

Existing rows require no destructive migration. When reading a historical plan
without the new fields, the application uses `sampleImageUrl` as the style image
and leaves the detail image empty until the merchant adds one.

The analysis summaries are carried through the workbench state, supplied to
prompt polishing and image generation, and persisted with the plan in a single
JSON text field. This keeps the original structured recognition result available
without adding several narrowly scoped columns.

## UI states and errors

- Each image slot shows its own upload-in-progress state.
- The analysis action is disabled until all three images are available and while
  an analysis request is running.
- Analysis success replaces the initial demo prompt with the generated template
  and moves the merchant to the existing requirements step.
- Analysis failure displays a retryable message and preserves all uploaded images
  and any text currently in the prompt editor.
- Replacing or removing an image marks prior analysis as stale. The merchant must
  run analysis again before treating the summaries as current.
- Generation remains disabled while upload or analysis is in progress.

## Validation and security

- All AI and persistence routes continue to require a merchant session.
- Image references are accepted only through server-validated request fields.
- Provider errors do not include authorization headers, API keys, or full provider
  request bodies.
- The browser never receives the Bailian API key.
- Existing file-size and image-type validation in `/api/files` remains the upload
  boundary for all three slots.

## Testing and acceptance

Automated coverage must verify:

- independent upload, replacement, removal, and preview for all three slots;
- disabled/enabled analysis action states;
- the fixed image ordering sent to `qwen3.7-flash`;
- structured response validation and retryable errors;
- insertion of `templatePrompt` into an editable prompt field;
- prompt polishing after analysis;
- initial generation with room, style, and detail images;
- similar generation with current effect, style, and detail images;
- plan persistence of both new material roles and legacy compatibility;
- historical plans without a detail image continue to load.

Before production handoff, run the full test suite, lint, and build, deploy the
approved commit, then perform a signed-in browser test covering three uploads,
AI analysis, manual prompt editing, prompt polishing, image generation, and plan
save. Vercel runtime logs must confirm successful analysis, upload, generation,
and persistence requests.
