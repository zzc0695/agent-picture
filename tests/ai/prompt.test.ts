import { describe, expect, it } from "vitest";
import { buildOptimizedPromptInput } from "@/lib/ai/prompt";

describe("prompt construction", () => {
  it("adds structure and sample fidelity requirements", () => {
    const result = buildOptimizedPromptInput({
      userPrompt: "米白色窗帘，温馨一点",
      fidelity: "strict",
      materialSummary: "米白高遮光绒布窗帘，遮光强、垂感好",
    });

    expect(result).toContain("保留原房间结构");
    expect(result).toContain("严格还原");
    expect(result).toContain("米白高遮光绒布窗帘");
  });
});
