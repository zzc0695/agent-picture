// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/bailian", () => ({ getBailianConfig: () => ({apiKey:"test",textModel:"vision"}),createBailianTextClient:()=>({chat:{completions:{create}}}),extractChatCompletionText:(r:{text:string})=>r.text }));
import { createGroundedPrompt } from "@/lib/ai/grounded-prompt";
describe("image-grounded prompt writing", () => {
  it("reads all three images before returning an actual-image design", async () => {
    create.mockResolvedValue({text:JSON.stringify({roomSummary:"左侧窗，沙发在前景",styleSummary:"灰色打孔单层帘",materialSummary:"素面哑光细织纹",optimizedPrompt:"沿左侧窗原杆安装灰色打孔单层帘，保留素面哑光细织纹与沙发前景遮挡。",negativePrompt:"不改成提花或双层"})});
    const result=await createGroundedPrompt(['room','style','fabric'],'法式','strict');
    expect(create.mock.calls[0][0].messages[0].content.slice(0,3)).toEqual(['room','style','fabric'].map(url=>({type:'image_url',image_url:{url}})));
    expect(result.optimizedPrompt).toContain('打孔单层');
    expect(result.materialSummary).toContain('素面');
    expect(create.mock.calls[0][0].messages[0].content[3].text).toContain('先观察');
  });
  it("rejects a generic prompt without the image observations", async () => {
    create.mockResolvedValue({text:JSON.stringify({optimizedPrompt:'漂亮法式窗帘',negativePrompt:'变形'})});
    await expect(createGroundedPrompt(['room','style','fabric'],'法式','strict')).rejects.toThrow();
  });
});
