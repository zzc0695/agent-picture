// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({admin:vi.fn(),create:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/auth/admin",()=>({requireAdmin:m.admin}));
vi.mock("@/lib/db",()=>({db:{invitation:{create:m.create,updateMany:m.update}}}));
import { POST, PATCH } from "@/app/api/admin/invitations/route";
const req=(body:unknown)=>new Request("http://local/api/admin/invitations",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();m.admin.mockResolvedValue({merchantId:"admin"});m.create.mockResolvedValue({id:"i",code:"code"});});
it("denies ordinary users creating or closing invitations",async()=>{m.admin.mockResolvedValue(null);expect((await POST(req({}))).status).toBe(403);expect((await PATCH(req({id:"i",disabled:true}))).status).toBe(403);expect(m.create).not.toHaveBeenCalled();expect(m.update).not.toHaveBeenCalled();});
it("creates high entropy codes and bounded trial quotas",async()=>{expect((await POST(req({label:"第一批",maxUses:5,validDays:14}))).status).toBe(201);expect(m.create).toHaveBeenCalledWith({data:expect.objectContaining({label:"第一批",maxUses:5,dailyImages:5,dailyText:10,concurrentImages:1,createdById:"admin",code:expect.stringMatching(/^[A-F0-9]{24}$/),expiresAt:expect.any(Date)})});});
it("rejects unlimited quotas, missing limits and invalid expiry",async()=>{for(const changes of [{dailyImages:0},{maxUses:0},{validDays:0},{validDays:91}])expect((await POST(req({label:"test",maxUses:5,validDays:14,...changes}))).status).toBe(400);expect(m.create).not.toHaveBeenCalled();});
it("closes existing invitations and reports missing invitations",async()=>{m.update.mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:0});expect((await PATCH(req({id:"i",disabled:true}))).status).toBe(200);expect(m.update).toHaveBeenCalledWith({where:{id:"i"},data:{disabled:true}});expect((await PATCH(req({id:"missing",disabled:true}))).status).toBe(404);});
