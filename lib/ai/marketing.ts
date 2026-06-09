import OpenAI from "openai";

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
    `效果图：${input.effectImageUrl}`,
    `客户备注：${input.customerNotes}`,
  ].join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return {
      shortVideoScript:
        "开场展示客户原房间，再切换窗帘上墙效果，重点讲遮光、垂感和整体氛围提升。",
      socialCopy:
        "这套米白窗帘让空间立刻柔和下来，遮光和垂感都很适合卧室/客厅客户参考。",
      customerScript:
        "您看这张效果图，窗帘颜色和房间整体色调比较协调，也能保留空间的通透感。",
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
