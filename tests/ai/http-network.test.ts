import { describe, it, expect } from "vitest";
import { aiErrorResponse } from "@/lib/ai/http";
describe("model connection errors", () => {
  it("explains an upstream billing refusal without exposing the provider response", async () => {
    const response=aiErrorResponse(new Error("400 Access denied, please make sure your account is in good standing."),"失败");
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("阿里云余额及欠费状态");
  });
  it("reports a connection outage without exposing transport internals", async () => {
    const error = new TypeError("fetch failed", { cause: { code: "UND_ERR_CONNECT_TIMEOUT", address: "private-address" } });
    const response = aiErrorResponse(error, "任务失败");
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("图片与要求已保留");
    expect(body.error).not.toContain("private-address");
  });
});
