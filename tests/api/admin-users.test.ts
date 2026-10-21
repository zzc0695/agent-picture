// @vitest-environment node
import { expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(()=>({ admin: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/auth/admin",()=>({requireAdmin:mocks.admin}));
vi.mock("@/lib/db",()=>({db:{merchant:{updateMany:mocks.updateMany}}}));
import { GET, PATCH } from "@/app/api/admin/users/route";
beforeEach(()=>vi.resetAllMocks());
it("denies non-admin reads and writes",async()=>{
 mocks.admin.mockResolvedValue(null);
 expect((await GET(new Request('http://localhost/api/admin/users'))).status).toBe(403);
 expect((await PATCH(new Request('http://localhost/api/admin/users',{method:'PATCH',body:'{}'}))).status).toBe(403);
 expect(mocks.updateMany).not.toHaveBeenCalled();
});
it("rejects invalid limits and self-disable",async()=>{
 mocks.admin.mockResolvedValue({merchantId:'admin'});
 for(const patch of [{dailyImages:-1},{disabled:true}]) {
 const body={id:'admin',name:'Admin',disabled:false,dailyImages:null,dailyText:null,concurrentImages:null,...patch};
 expect((await PATCH(new Request('http://localhost/api/admin/users',{method:'PATCH',body:JSON.stringify(body)}))).status).toBe(400);
 }
 expect(mocks.updateMany).not.toHaveBeenCalled();
});
