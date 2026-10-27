// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
const m=vi.hoisted(()=>({transaction:vi.fn(),invite:vi.fn(),claim:vi.fn(),create:vi.fn(),signIn:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{$transaction:m.transaction}}));
vi.mock("@/lib/auth/credentials",async original=>({...await original<typeof import("@/lib/auth/credentials")>(),signIn:m.signIn}));
import { POST } from "@/app/api/auth/register/route";
const body={name:" 店铺 ",username:" Shop_01 ",email:" SHOP@Example.com ",password:"password123",inviteCode:"a".repeat(24)};
const request=(value:unknown)=>new Request("http://local/api/auth/register",{method:"POST",body:JSON.stringify(value)});
beforeEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();m.transaction.mockImplementation(action=>action({invitation:{findUnique:m.invite,updateMany:m.claim},merchant:{create:m.create}}));m.invite.mockResolvedValue({id:"inv",maxUses:5,dailyImages:5,dailyText:10,concurrentImages:1});m.claim.mockResolvedValue({count:1});m.create.mockResolvedValue({id:"new",email:"shop@example.com"});});
it("normalizes identity and atomically claims an invitation with trial quotas",async()=>{
 expect((await POST(request(body))).status).toBe(201);
 expect(m.invite).toHaveBeenCalledWith({where:{code:"A".repeat(24)}});
 expect(m.claim).toHaveBeenCalledWith({where:{id:"inv",disabled:false,expiresAt:{gt:expect.any(Date)},usedCount:{lt:5}},data:{usedCount:{increment:1}}});
 const data=m.create.mock.calls[0][0].data;expect(data).toMatchObject({name:"店铺",username:"shop_01",email:"shop@example.com",invitationId:"inv",dailyImages:5,dailyText:10,concurrentImages:1,onboarded:false});expect(await bcrypt.compare(body.password,data.passwordHash)).toBe(true);expect(m.signIn).toHaveBeenCalledWith({merchantId:"new",email:"shop@example.com"});
});
it("registers without an email",async()=>{m.create.mockResolvedValue({id:"new",email:null});expect((await POST(request({...body,email:""}))).status).toBe(201);expect(m.create.mock.calls[0][0].data.email).toBeNull();expect(m.signIn).toHaveBeenCalledWith({merchantId:"new",email:""});});
it("requires invitations even for email registrations",async()=>{const {inviteCode: omitted,...rest}=body;void omitted;expect((await POST(request(rest))).status).toBe(400);expect(m.transaction).not.toHaveBeenCalled();});
it("does not create an account for unknown, closed, expired or exhausted invitations",async()=>{m.invite.mockResolvedValueOnce(null);expect((await POST(request(body))).status).toBe(400);m.claim.mockResolvedValue({count:0});expect((await POST(request(body))).status).toBe(400);expect(m.create).not.toHaveBeenCalled();expect(m.signIn).not.toHaveBeenCalled();});
it("lets uniqueness errors abort the transaction without signing in",async()=>{m.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate",{code:"P2002",clientVersion:"7"}));expect((await POST(request(body))).status).toBe(409);expect(m.signIn).not.toHaveBeenCalled();});
it("blocks weak passwords, ambiguous usernames and admin email claims",async()=>{for(const change of [{password:"short"},{password:"中".repeat(25)},{username:"someone@example.com"},{username:"ab"},{email:"not-email"}])expect((await POST(request({...body,...change}))).status).toBe(400);vi.stubEnv("ADMIN_EMAILS","shop@example.com");expect((await POST(request(body))).status).toBe(400);expect(m.transaction).not.toHaveBeenCalled();});
it("retries a serialization conflict without losing registration",async()=>{m.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict",{code:"P2034",clientVersion:"7"}));expect((await POST(request(body))).status).toBe(201);expect(m.transaction).toHaveBeenCalledTimes(2);expect(m.create).toHaveBeenCalledTimes(1);});
