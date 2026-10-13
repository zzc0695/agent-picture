import { z } from "zod";
import { createBailianTextClient, extractChatCompletionText, getBailianConfig } from "./bailian";
import { parseJsonOutput } from "./errors";
import { toAsyncImageReference } from "@/lib/files/storage";
import type { PhotoRole } from "@/lib/photo-types";

export async function checkPhoto(url: string, role: PhotoRole) {
  const config = getBailianConfig();
  const reference = await toAsyncImageReference(url);
  const response = await createBailianTextClient(config.apiKey!).chat.completions.create({
    model: config.textModel,
    messages: [{ role: "user", content: [
      { type: "image_url", image_url: { url: reference } },
      { type: "text", text: `检查这张${role === "room" ? "房间" : role === "style" ? "窗帘款式" : "面料近照"}能否用于窗帘还原。房间图看窗户及安装边界；款式图看帘头、褶皱和下摆；面料近照只要求颜色及织纹，不要求完整窗帘。检查严重模糊、遮挡、逆光和明显滤镜偏色，不凭照片推算真实色号。号码牌价格牌品牌牌不算面料图案。能确认主要信息就 usable=true，不因轻微倾斜、不标准或局部拍摄要求重拍。只输出 JSON {"usable":boolean,"tip":string}。可用时 tip 写能看清的关键信息；确实缺少关键部分时只给最重要的一句具体补拍建议，如“补一张帘头近照，会更容易还原款式”。tip 不超过50字，不要求用户重拍所有图片，不用技术术语。` },
    ] }], response_format: { type: "json_object" }, max_tokens: 180, ...{ enable_thinking: false },
  }, { timeout: 15_000, maxRetries: 0 });
  return z.object({ usable: z.boolean(), tip: z.string().trim().min(1).max(140) }).parse(parseJsonOutput(extractChatCompletionText(response)));
}
