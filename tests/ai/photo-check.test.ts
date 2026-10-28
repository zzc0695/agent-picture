// @vitest-environment node
import { expect, it, vi } from "vitest";
const create = vi.hoisted(()=>vi.fn());
vi.mock("@/lib/ai/bailian",()=>({getBailianConfig:()=>({apiKey:"test",textModel:"vision"}),createBailianTextClient:()=>({chat:{completions:{create}}}),extractChatCompletionText:(r:{text:string})=>r.text}));
vi.mock("@/lib/files/storage",()=>({toAsyncImageReference:async (url:string)=>url}));
import { checkPhoto } from "@/lib/ai/photo-check";
it("checks a close-up as a material photo without requiring a complete curtain",async()=>{
  create.mockResolvedValue({text:JSON.stringify({usable:true,tip:"织纹清楚，可用于还原面料"})});
  expect(await checkPhoto("fabric","detail")).toEqual({usable:true,tip:"织纹清楚，可用于还原面料"});
  expect(create.mock.calls[0][0].messages[0].content[1].text).toContain("不要求完整窗帘");
  expect(create.mock.calls[0][0].messages[0].content[1].text).toContain("不评价其他角色图片是否缺失");
});
