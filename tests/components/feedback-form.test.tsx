import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FeedbackForm } from "@/components/feedback-form";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("submits the current plan and prevents duplicate submission after success",async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:"f"})});vi.stubGlobal("fetch",fetcher);
 render(<FeedbackForm planId="p"/>);fireEvent.change(screen.getByLabelText("问题描述"),{target:{value:"窗户布局与原图不一致"}});fireEvent.click(screen.getByRole("button",{name:"提交反馈"}));
 await screen.findByRole("status");expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({planId:"p",category:"quality",message:"窗户布局与原图不一致"});expect(screen.queryByRole("button",{name:"提交反馈"})).not.toBeInTheDocument();
});
it("preserves the description and allows retry on failure",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("网络暂时不可用")));render(<FeedbackForm planId="p"/>);fireEvent.change(screen.getByLabelText("问题描述"),{target:{value:"生成效果与预期不同"}});fireEvent.click(screen.getByRole("button",{name:"提交反馈"}));await screen.findByRole("alert");expect(screen.getByLabelText("问题描述")).toHaveValue("生成效果与预期不同");await waitFor(()=>expect(screen.getByRole("button",{name:"提交反馈"})).toBeEnabled());
});
