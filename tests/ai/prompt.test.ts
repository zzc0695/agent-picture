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
  it("expands style into concrete construction and material directions", () => {
    const result = buildOptimizedPromptInput({ userPrompt: "法式轻雅窗帘", fidelity: "balanced", materialSummary: "参考样本" });
    expect(result).toContain("350–550");
    expect(result).toContain("成组双褶或三褶");
    expect(result).toContain("帘头与褶皱");
    expect(result).toContain("不能覆盖已指定的样本");
  });
});
