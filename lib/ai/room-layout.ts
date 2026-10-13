import { z } from "zod";
import { createBailianTextClient, extractChatCompletionText, getBailianConfig } from "./bailian";
import { parseJsonOutput } from "./errors";

const layoutSchema = z.object({
  curtainArea: z.string().trim().min(1).max(300),
  fixedObjects: z.array(z.string().trim().min(1).max(160)).max(12),
  occlusion: z.string().trim().min(1).max(300),
});

const instruction = [
  "为窗帘局部编辑记录这张原房间照片的空间锚点。只描述图中实际可见的信息，不建议装修、不推断被遮挡的家具、不编造尺寸。",
  "按画面左/中/右、上/下及相对窗户的关系描述窗户、现有窗帘或可以安装窗帘的位置。没有现有窗帘时描述窗户对应的安装区域。",
  "逐项记录床、沙发、茶几、桌椅、柜体、灯具、摆件的原位置、朝向、轮廓与相互距离关系；看不清的细节明确写无法确认。",
  "指出哪些前景物体遮挡窗帘或窗户，这些物体必须保留在窗帘前面；不允许把窗帘画到前景家具表面。没有遮挡时明确写无明显遮挡。",
  "只返回 JSON：curtainArea 为窗帘安装区域说明；fixedObjects 为需要原样保留的可见物体位置说明字符串数组；occlusion 为遮挡关系说明。全文保持简短，不输出坐标框或蒙版。",
].join("\n");

// A short, automatic observation step. Reuse the existing vision-capable text
// model and already validated reference instead of adding an upload or UI step.
export async function describeRoomLayout(imageReference: string) {
  const config = getBailianConfig();
  const response = await createBailianTextClient(config.apiKey!).chat.completions.create({
    model: config.textModel,
    messages: [{ role: "user", content: [
      { type: "image_url", image_url: { url: imageReference } },
      { type: "text", text: instruction },
    ] }],
    response_format: { type: "json_object" },
    max_tokens: 600,
    ...{ enable_thinking: false },
  }, { timeout: 12_000, maxRetries: 0 });
  const layout = layoutSchema.parse(parseJsonOutput(extractChatCompletionText(response)));
  console.info(JSON.stringify({ event: "room_layout_observed", objectCount: layout.fixedObjects.length }));
  return [
    "原图自动观察（仅用于定位；与实际图像冲突时以图1为准）：",
    `窗帘区域：${layout.curtainArea.slice(0, 140)}`,
    ...layout.fixedObjects.slice(0, 6).map(object => `保留原位：${object.slice(0, 80)}`),
    `前后遮挡：${layout.occlusion.slice(0, 140)}`,
    "以上物体不属于样本风格迁移范围，逐项保持原图位置、数量、朝向和外观。",
  ].join("\n");
}
