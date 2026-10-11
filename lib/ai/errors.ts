export class AiUnavailableError extends Error {
  constructor() {
    super("AI 服务尚未配置，请联系管理员后重试");
    this.name = "AiUnavailableError";
  }
}

export function parseJsonOutput(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}
