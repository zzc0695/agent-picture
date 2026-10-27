import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth-form";
vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("prefills an invitation and allows registration with no email",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({ok:true},{status:201}));vi.stubGlobal("fetch",fetcher);render(<AuthForm register inviteCode={"A".repeat(24)}/>);
 expect(screen.getByLabelText("邀请码")).toHaveValue("A".repeat(24));expect(screen.getByLabelText("邮箱（选填）")).not.toBeRequired();
 fireEvent.change(screen.getByLabelText("店铺名称"),{target:{value:"试用门店"}});fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"trial_shop"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"password123"}});fireEvent.submit(screen.getByRole("button",{name:"注册并开始使用"}).closest("form")!);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({username:"trial_shop",email:"",inviteCode:"A".repeat(24)});
});
