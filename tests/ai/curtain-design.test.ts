import { describe, expect, it } from "vitest";
import { curtainStyleDirection } from "@/lib/curtain-design";
import { curtainTemplates } from "@/lib/prompt-templates";

describe("curtain design directions", () => {
  it("distinguishes curtain construction and material across styles", () => {
    expect(curtainStyleDirection("现代法式窗帘")).toContain("成组双褶或三褶");
    expect(curtainStyleDirection("北欧清爽")).toContain("轻盈面料");
    expect(curtainStyleDirection("轻奢")).toContain("随绒向");
    expect(curtainStyleDirection("只换颜色")).toBe("");
  });
  it("keeps template identities while including actionable installation details", () => {
    expect(curtainTemplates).toHaveLength(20);
    expect(curtainTemplates[8].id).toBe("curtain-guide-9");
    expect(curtainTemplates[8].body).toContain("等距连续 S 形");
    expect(curtainTemplates[9].body).toContain("顶部每组双褶");
    expect(curtainTemplates[11].body).toContain("由下向上叠起的水平层");
    expect(curtainTemplates[18].body).toContain("亮部、暗部与褶谷");
    expect(curtainTemplates.every(item => item.body.includes("不移动床、沙发、桌椅"))).toBe(true);
  });
});
