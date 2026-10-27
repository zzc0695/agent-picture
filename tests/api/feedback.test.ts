// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), plan: vi.fn(), record: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/require-session", () => ({ requireMerchantSession: m.session, unauthorizedResponse: () => new Response(null,{status:401}) }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin:m.admin }));
vi.mock("@/lib/db", () => ({ db: { customerPlan:{findFirst:m.plan}, generationRecord:{findFirst:m.record}, feedback:{create:m.create,updateMany:m.update} } }));
import { POST } from "@/app/api/feedback/route";
import { PATCH } from "@/app/api/admin/feedback/route";
const request = (data: unknown) => new Request("http://localhost/api/feedback",{method:"POST",body:JSON.stringify(data)});
const input={planId:"p",category:"quality",message:"窗户位置变化太大"};
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({merchantId:"owner"});m.plan.mockResolvedValue({id:"p",primaryImageUrl:"https://image.test/result.png"});m.record.mockResolvedValue({id:"r"});m.create.mockResolvedValue({id:"f"});});
it("rejects unauthenticated submission",async()=>{m.session.mockResolvedValue(null);expect((await POST(request(input))).status).toBe(401);expect(m.create).not.toHaveBeenCalled();});
it("does not expose or accept another merchant's plan",async()=>{m.plan.mockResolvedValue(null);expect((await POST(request(input))).status).toBe(404);expect(m.plan).toHaveBeenCalledWith(expect.objectContaining({where:{id:"p",merchantId:"owner"}}));expect(m.create).not.toHaveBeenCalled();});
it("validates description and rejects injected ownership",async()=>{for(const body of [{...input,message:" "},{...input,merchantId:"victim"},{...input,recordId:"foreign"}])expect((await POST(request(body))).status).toBe(400);expect(m.create).not.toHaveBeenCalled();});
it("links only the owner's matching generation record",async()=>{expect((await POST(request(input))).status).toBe(201);expect(m.record).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({merchantId:"owner",OR:[{planId:"p"},{resultImageUrl:"https://image.test/result.png"}]})}));expect(m.create).toHaveBeenCalledWith({data:{merchantId:"owner",planId:"p",recordId:"r",category:"quality",message:input.message}});});
it("allows feedback when no generation task exists",async()=>{m.record.mockResolvedValue(null);expect((await POST(request(input))).status).toBe(201);expect(m.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({recordId:null})}));});
it("restricts processing to admins and validates state",async()=>{m.admin.mockResolvedValue(null);expect((await PATCH(request({id:"f",status:"resolved"}))).status).toBe(403);m.admin.mockResolvedValue({merchantId:"admin"});expect((await PATCH(request({id:"f",status:"invalid"}))).status).toBe(400);expect(m.update).not.toHaveBeenCalled();m.update.mockResolvedValue({count:1});expect((await PATCH(request({id:"f",status:"resolved"}))).status).toBe(200);expect(m.update).toHaveBeenCalledWith({where:{id:"f"},data:{status:"resolved"}});m.update.mockResolvedValue({count:0});expect((await PATCH(request({id:"missing",status:"resolved"}))).status).toBe(404);});
