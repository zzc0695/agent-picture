// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({find:vi.fn(),compare:vi.fn(),signIn:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{merchant:{findUnique:m.find}}}));
vi.mock("bcryptjs",()=>({default:{compare:m.compare}}));
vi.mock("@/lib/auth/credentials",async original=>({...await original<typeof import("@/lib/auth/credentials")>(),signIn:m.signIn}));
import { POST } from "@/app/api/auth/login/route";
const req=(email:string)=>new Request("http://local/api/auth/login",{method:"POST",body:JSON.stringify({email,password:"password123"})});
beforeEach(()=>{vi.resetAllMocks();m.find.mockResolvedValue({id:"m",email:null,passwordHash:"hash",disabled:false,onboarded:true});m.compare.mockResolvedValue(true);});
it("supports username sign in without treating the username as an admin email",async()=>{expect((await POST(req(" Shop_01 "))).status).toBe(200);expect(m.find).toHaveBeenCalledWith({where:{username:"shop_01"}});expect(m.signIn).toHaveBeenCalledWith({merchantId:"m",email:""});});
it("keeps existing email sign in",async()=>{m.find.mockResolvedValue({id:"m",email:"shop@example.com",passwordHash:"hash"});expect((await POST(req(" SHOP@EXAMPLE.COM "))).status).toBe(200);expect(m.find).toHaveBeenCalledWith({where:{email:"shop@example.com"}});});
it("rejects disabled accounts and wrong passwords",async()=>{m.find.mockResolvedValueOnce({disabled:true});expect((await POST(req("shop_01"))).status).toBe(401);m.compare.mockResolvedValue(false);expect((await POST(req("shop_01"))).status).toBe(401);expect(m.signIn).not.toHaveBeenCalled();});
