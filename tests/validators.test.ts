import { describe, expect, it } from "vitest";
import { materialSchema, planSchema } from "@/lib/validators";

describe("validators", () => {
  it("accepts a valid material", () => {
    expect(
      materialSchema.parse({
        name: "米白窗帘",
        category: "窗帘",
        color: "米白",
        fabric: "绒布",
        priceRange: "中高端",
        sizeNote: "适合落地窗",
        sellingPoints: "遮光强、垂感好",
        imageUrl: "/uploads/a.jpg",
      }),
    ).toMatchObject({ name: "米白窗帘" });
  });

  it("rejects empty plan prompt", () => {
    expect(() =>
      planSchema.parse({
        customerName: "王女士",
        notes: "",
        roomImageUrl: "/uploads/room.jpg",
        sampleImageUrl: "/uploads/sample.jpg",
        originalPrompt: "",
        optimizedPrompt: "",
        negativePrompt: "",
        fidelity: "strict",
        materialIds: [],
      }),
    ).toThrow();
  });
});
