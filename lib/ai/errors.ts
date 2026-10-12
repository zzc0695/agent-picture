export class AiUnavailableError extends Error {
  constructor() {
    super("AI 服务尚未配置，请联系管理员后重试");
    this.name = "AiUnavailableError";
  }
}

export class AiResourceNotFoundError extends Error {}

export function isPreRequestConnectionFailure(error: unknown): boolean {
  if (!(error instanceof Error) || !error.cause || typeof error.cause !== "object") return false;
  const cause = error.cause as { code?: string; syscall?: string; errors?: { code?: string; syscall?: string }[] };
  if (cause.code === "UND_ERR_CONNECT_TIMEOUT") return true;
  const connects = (item: { code?: string; syscall?: string }) => item.syscall === "connect" && ["ETIMEDOUT", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH"].includes(item.code || "");
  return cause.errors?.length ? cause.errors.every(connects) : connects(cause);
}

export function parseJsonOutput(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}
