import OpenAI from "openai";

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

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `生成软装效果图请求：${input.optimizedPrompt}`,
              `负向要求：${input.negativePrompt}`,
              `样本还原度：${input.fidelity}`,
              `客户房间图：${input.roomImageUrl}`,
              `样本图：${input.sampleImageUrl}`,
              input.referenceImageUrl
                ? `当前效果参考图：${input.referenceImageUrl}`
                : "",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  return {
    imageUrl: input.roomImageUrl,
    inputSummary: response.output_text.slice(0, 240),
  };
}
