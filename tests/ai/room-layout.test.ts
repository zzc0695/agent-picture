// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/bailian", () => ({
  getBailianConfig: () => ({ apiKey: "test", textModel: "vision-model" }),
  createBailianTextClient: () => ({ chat: { completions: { create } } }),
  extractChatCompletionText: (response: { text: string }) => response.text,
}));
import { describeRoomLayout } from "@/lib/ai/room-layout";
describe("automatic room observations", () => {
  beforeEach(() => vi.clearAllMocks());
  it("records room-specific furniture positions and foreground occlusion using only the original room", async () => {
    create.mockResolvedValue({ text: JSON.stringify({ curtainArea: "右侧落地窗", fixedObjects: ["沙发位于画面左侧", "茶几位于中央前景"], occlusion: "沙发扶手遮挡帘布下缘" }) });
    const result = await describeRoomLayout("https://example.com/original.png");
    expect(result).toContain("沙发位于画面左侧");
    expect(result).toContain("沙发扶手遮挡帘布下缘");
    const request = create.mock.calls[0][0];
    expect(request.messages[0].content.filter((part: { type: string }) => part.type === "image_url")).toEqual([{ type:"image_url", image_url:{url:"https://example.com/original.png"} }]);
    expect(create.mock.calls[0][1]).toEqual({ timeout: 12000, maxRetries: 0 });
  });
  it("does not turn malformed observations into generation instructions", async () => {
    create.mockResolvedValue({ text: JSON.stringify({ curtainArea: "窗户", fixedObjects: "move sofa", occlusion: "none" }) });
    await expect(describeRoomLayout("image")).rejects.toThrow();
  });
});
