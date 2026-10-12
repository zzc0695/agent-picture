import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkbenchPage from "@/app/(dashboard)/page";

function mockApiResponses(options: { planError?: string; generationError?: string; existingPlan?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/materials") return Response.json({ materials: [{ id: "material-own", name: "我的面料", imageUrl: "/uploads/my-fabric.png" }] });
    if (url === "/api/customers") return Response.json({ customers: [] });
    if (url === "/api/plans/source" && options.existingPlan) return Response.json({ plan: { id: "source", customerName: "张先生", notes: "卧室", roomImageUrl: "/uploads/original.png", sampleImageUrl: "/uploads/style.png", styleImageUrl: "/uploads/style.png", detailImageUrl: "/uploads/detail.png", primaryImageUrl: "/uploads/previous.png", originalPrompt: "原方案要求", optimizedPrompt: "蓝色窗帘", negativePrompt: "变形", fidelity: "balanced", imageAnalysis: "{}", materials: [] } });

    if (url.endsWith("/api/files")) {
      const form = init?.body as FormData;
      const file = form.get("file") as File;
      return Response.json({ url: `https://blob.test/${file.name}` });
    }

    if (url.endsWith("/api/ai/optimize-prompt")) {
      return Response.json({
        optimizedPrompt: "优化后的窗帘效果图提示词",
        negativePrompt: "避免窗户变形",
      });
    }

    if (url.endsWith("/api/ai/analyze-materials")) {
      return Response.json({
        roomSummary: "明亮的现代客厅，大面积落地窗",
        styleSummary: "米白双层落地帘，简约褶皱",
        materialSummary: "细密哑光遮光布搭配白纱",
        templatePrompt: "识别生成的米白双层窗帘模板文案",
      });
    }

    if (url.endsWith("/api/ai/generate-image") && (!init || init.method !== "POST")) return Response.json({ jobId: null });
    if (url.includes("/api/ai/generate-image/")) return Response.json({ status: "succeeded", imageUrl: "/uploads/generated-effect.png" });
    if (url.endsWith("/api/ai/generate-image")) {
      if (options.generationError) return Response.json({ error: options.generationError }, { status: 502 });
      return Response.json({
        jobId: "job-test",
        inputSummary: "balanced: 优化后的窗帘效果图提示词",
      });
    }

    if (url.endsWith("/api/ai/generate-marketing")) {
      return Response.json({
        shortVideoScript: "短视频脚本内容",
        socialCopy: "接口返回的朋友圈文案",
        customerScript: "接口返回的客户沟通话术",
      });
    }

    if (url.endsWith("/share")) return Response.json({ path: "/share/test-token", expiresAt: "2026-10-20T00:00:00Z" });
    if (url.endsWith("/api/plans")) {
      if (options.planError) {
        return Response.json({ error: options.planError }, { status: 500 });
      }
      return Response.json(
        { plan: { id: "plan_1", customerName: "王女士" } },
        { status: 201 },
      );
    }

    if (url.startsWith("/api/files/download?")) {
      return new Response(new Blob(["image"], { type: "image/png" }), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition":
            'attachment; filename="curtain-plan-20260820.png"',
        },
      });
    }

    return Response.json({}, { status: 404 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}


describe("single-page workbench", () => {
  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, "", "/"); vi.restoreAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:effect-download") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("shows uploads, requirements and the result on one page, with optional tools collapsed", async () => {
    mockApiResponses(); render(<WorkbenchPage />);
    expect(screen.getByLabelText("生成要求")).toBeInTheDocument();
    for (const label of ["上传房间图片", "上传款式图片", "上传面料图片"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成效果图" })).toBeEnabled();
    expect(screen.getByText("效果图会显示在这里")).toBeInTheDocument();
    expect(screen.getByText("更多选项：素材库、识别与还原度").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: "进入下一步" })).not.toBeInTheDocument();
  });

  it("generates and saves directly, without requiring a customer name or a separate display step", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图");
    await user.click(screen.getByRole("button",{name:"保存方案"}));
    expect(await screen.findByRole("button",{name:"复制客户链接"})).toBeEnabled();
    const call=fetchMock.mock.calls.find(([url])=>String(url)==="/api/plans");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({customerName:"未命名客户",primaryImageUrl:"/uploads/generated-effect.png"});
    expect(screen.getByRole("link",{name:"查看已保存方案"})).toHaveAttribute("href","/plans/plan_1");
    expect(screen.getByLabelText("生成要求")).toBeInTheDocument();
  });

  it("copies a customer link directly after saving instead of creating duplicate plans", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图");
    await user.click(screen.getByRole("button",{name:"保存方案"})); await screen.findByRole("button",{name:"复制客户链接"});
    await user.click(screen.getByRole("button",{name:"复制客户链接"}));
    expect(await screen.findByLabelText("客户交付链接")).toHaveValue(window.location.origin+"/share/test-token");
    expect(fetchMock.mock.calls.filter(([url])=>String(url)==="/api/plans")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/plans/plan_1/share",expect.objectContaining({method:"POST"}));
  });

  it("uses the latest edited text after AI optimization instead of sending its stale result", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.click(screen.getByText("更多选项：素材库、识别与还原度"));
    await user.click(screen.getByRole("button",{name:"AI 润色要求"})); await screen.findByDisplayValue("优化后的窗帘效果图提示词");
    await user.clear(screen.getByLabelText("生成要求")); await user.type(screen.getByLabelText("生成要求"),"浅灰窗帘，保留书桌");
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图");
    const call=fetchMock.mock.calls.find(([url,init])=>String(url)==="/api/ai/generate-image"&&init?.method==="POST");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({optimizedPrompt:"浅灰窗帘，保留书桌",negativePrompt:"",originalPrompt:"浅灰窗帘，保留书桌"});
  });

  it("uploads all three references and analyzes them without navigating to another step", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    for(const [label,file] of [["上传房间图片","room.png"],["上传款式图片","style.png"],["上传面料图片","detail.png"]]) {
      await user.upload(screen.getByLabelText(label),new File(["image"],file,{type:"image/png"}));
      await screen.findByRole("img",{name:label.replace("上传","")});
    }
    await user.click(screen.getByText("更多选项：素材库、识别与还原度")); await user.click(screen.getByRole("button",{name:"识别图片补充要求"}));
    expect(await screen.findByDisplayValue("识别生成的米白双层窗帘模板文案")).toBeInTheDocument();
    const call=fetchMock.mock.calls.find(([url])=>String(url)==="/api/ai/analyze-materials");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({roomImageUrl:"https://blob.test/room.png",styleImageUrl:"https://blob.test/style.png",detailImageUrl:"https://blob.test/detail.png"});
    expect(screen.getByRole("button",{name:"生成效果图"})).toBeInTheDocument();
  });

  it("rejects oversized uploads before sending them to the server", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.upload(screen.getByLabelText("上传房间图片"),new File([new Uint8Array(4*1024*1024+1)],"room.png",{type:"image/png"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("4MB");
    expect(fetchMock.mock.calls.some(([url])=>String(url)==="/api/files")).toBe(false);
  });

  it("restores a completed result after reloading without submitting or charging again", async () => {
    localStorage.setItem("last-image-result","completed-job"); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    expect(await screen.findByAltText("生成效果图")).toHaveAttribute("src","/uploads/generated-effect.png");
    expect(fetchMock.mock.calls.some(([url,init])=>String(url)==="/api/ai/generate-image"&&init?.method==="POST")).toBe(false);
    expect(localStorage.getItem("last-image-result")).toBe("completed-job");
  });

  it("keeps pending version recovery ahead of loading the original plan", async () => {
    window.history.replaceState({},"","/?planId=source"); localStorage.setItem("image-generation-job","pending-job");
    const fetchMock=mockApiResponses({existingPlan:true}); render(<WorkbenchPage />); await screen.findByAltText("生成效果图");
    expect(fetchMock.mock.calls.some(([url])=>String(url)==="/api/plans/source")).toBe(false);
  });

  it("loads an existing plan and saves a new version without overwriting it", async () => {
    window.history.replaceState({},"","/?planId=source"); const user=userEvent.setup(); const fetchMock=mockApiResponses({existingPlan:true}); render(<WorkbenchPage />);
    await screen.findByDisplayValue("蓝色窗帘"); expect(screen.getByAltText("原方案效果图")).toHaveAttribute("src","/uploads/previous.png");
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图");
    const generation=fetchMock.mock.calls.find(([url,init])=>String(url)==="/api/ai/generate-image"&&init?.method==="POST");
    expect(JSON.parse(String(generation?.[1]?.body))).toMatchObject({planId:"source",referenceImageUrl:"/uploads/previous.png",roomImageUrl:"/uploads/original.png"});
    await user.click(screen.getByRole("button",{name:"保存方案"})); await screen.findByRole("button",{name:"复制客户链接"});
    const saved=fetchMock.mock.calls.find(([url])=>String(url)==="/api/plans");
    expect(JSON.parse(String(saved?.[1]?.body))).toMatchObject({sourcePlanId:"source"});
    expect(fetchMock.mock.calls.some(([url,init])=>String(url)==="/api/plans/source"&&init?.method==="PATCH")).toBe(false);
  });

  it("uses a selected account material as the reference and preserves its association", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.click(screen.getByText("更多选项：素材库、识别与还原度")); await screen.findAllByRole("option",{name:"我的面料"});
    await user.selectOptions(screen.getByLabelText("素材库面料细节"),"material-own");
    expect(screen.getByAltText("面料图片")).toHaveAttribute("src","/uploads/my-fabric.png");
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图"); await user.click(screen.getByRole("button",{name:"保存方案"})); await screen.findByRole("button",{name:"复制客户链接"});
    const saved=fetchMock.mock.calls.find(([url])=>String(url)==="/api/plans"); expect(JSON.parse(String(saved?.[1]?.body))).toMatchObject({detailImageUrl:"/uploads/my-fabric.png",materialIds:["material-own"]});
  });

  it("makes marketing optional and saves distinct copy fields when requested", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); render(<WorkbenchPage />);
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图");
    expect(fetchMock.mock.calls.some(([url])=>String(url)==="/api/ai/generate-marketing")).toBe(false);
    await user.click(screen.getByText("需要营销文案？")); await user.click(screen.getByRole("button",{name:"生成营销文案"})); await screen.findByText("接口返回的朋友圈文案");
    await user.type(screen.getByLabelText("客户称呼"),"李先生"); // Changing customer intentionally clears stale customer copy.
    await user.click(screen.getByRole("button",{name:"生成营销文案"})); await screen.findByText("接口返回的客户沟通话术");
    await user.click(screen.getByRole("button",{name:"保存方案"})); await screen.findByRole("button",{name:"复制客户链接"});
    const saved=fetchMock.mock.calls.find(([url])=>String(url)==="/api/plans"); expect(JSON.parse(String(saved?.[1]?.body))).toMatchObject({customerName:"李先生",shortVideoScript:"短视频脚本内容",socialCopy:"接口返回的朋友圈文案",customerScript:"接口返回的客户沟通话术"});
  });

  it("blocks repeat generation while submission is pending", async () => {
    const user=userEvent.setup(); const fetchMock=mockApiResponses(); const regular=fetchMock.getMockImplementation()!; let resolve!: (response:Response)=>void;
    fetchMock.mockImplementation(async (url,init)=>String(url)==="/api/ai/generate-image"&&init?.method==="POST" ? new Promise<Response>(done=>{resolve=done;}) : regular(url,init));
    render(<WorkbenchPage />); await user.click(screen.getByRole("button",{name:"生成效果图"}));
    expect(screen.getByRole("button",{name:"正在生成..."})).toBeDisabled();
    await act(async()=>resolve(Response.json({jobId:"pending"}))); await screen.findByAltText("生成效果图");
    expect(fetchMock.mock.calls.filter(([url,init])=>String(url)==="/api/ai/generate-image"&&init?.method==="POST")).toHaveLength(1);
  });

  it("shows generation failures in place and allows retry without showing a fake result", async () => {
    const user=userEvent.setup(); mockApiResponses({generationError:"AI 任务提交失败，请重试"}); render(<WorkbenchPage />);
    await user.click(screen.getByRole("button",{name:"生成效果图"})); expect(await screen.findByRole("alert")).toHaveTextContent("AI 任务提交失败");
    expect(screen.queryByAltText("生成效果图")).not.toBeInTheDocument(); expect(screen.getByRole("button",{name:"生成效果图"})).toBeEnabled();
  });

  it("keeps the generated image available when saving fails", async () => {
    const user=userEvent.setup(); mockApiResponses({planError:"保存失败，请重试"}); render(<WorkbenchPage />);
    await user.click(screen.getByRole("button",{name:"生成效果图"})); await screen.findByAltText("生成效果图"); await user.click(screen.getByRole("button",{name:"保存方案"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存失败"); expect(screen.getByAltText("生成效果图")).toBeInTheDocument(); expect(screen.getByRole("button",{name:"保存方案"})).toBeEnabled();
  });
});
