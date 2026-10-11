import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkbenchPage from "@/app/(dashboard)/page";
import { ResultPanel } from "@/components/result-panel";

function mockApiResponses(options: { planError?: string; generationError?: string } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

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

describe("WorkbenchPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:effect-download"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
  });

  it("resumes a saved image task after reloading without resubmitting", async () => {
    localStorage.setItem("image-generation-job", "saved-job");
    const fetchMock = mockApiResponses();
    render(<WorkbenchPage />);
    expect(await screen.findByAltText("生成效果图")).toHaveAttribute("src", "/uploads/generated-effect.png");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/api/ai/generate-image") && init?.method === "POST")).toBe(false);
    expect(localStorage.getItem("image-generation-job")).toBeNull();
  });

  it("renders the AI studio proposal flow from the new design reference", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<WorkbenchPage />);

    expect(screen.getByText("设计工作室")).toBeInTheDocument();
    expect(screen.getByText("王女士 · 客厅")).toBeInTheDocument();
    expect(screen.getByText("步骤 01 - 空间与材质")).toBeInTheDocument();
    expect(screen.getByText("客户空间")).toBeInTheDocument();
    expect(screen.getByText("材质样本")).toBeInTheDocument();
    expect(
      screen.getByLabelText("客户称呼"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "进入下一步" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    expect(screen.getByText("生成要求")).toBeInTheDocument();
    expect(screen.getByText("步骤 02 · 核心构思")).toBeInTheDocument();
    expect(screen.getByText("模板库")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    expect(await screen.findByText("效果呈现")).toBeInTheDocument();
    expect(screen.getByAltText("生成效果图")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存方案" }));
    expect(screen.getByText("方案展示")).toBeInTheDocument();
    expect(screen.getByText("方案已保存")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看客户方案" }),
    ).toHaveAttribute("href", "/plans");
    expect(screen.getByText("社交分享方案")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看已保存方案" }),
    ).toHaveAttribute("href", "/plans/plan_1");
  });

  it("uses backend APIs for optimization, generation, marketing, and saving", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "AI 润色" }));
    expect(await screen.findByDisplayValue("优化后的窗帘效果图提示词")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    expect(await screen.findByText("效果呈现")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成营销文案" }));
    expect(await screen.findByText("接口返回的朋友圈文案")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存方案" }));
    expect(await screen.findByText("方案展示")).toBeInTheDocument();
    expect(screen.getByText("接口返回的客户沟通话术")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/optimize-prompt",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/generate-image",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/generate-marketing",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uploads three image roles, analyzes them, and uses them for generation", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();

    render(<WorkbenchPage />);

    await user.upload(
      screen.getByLabelText("上传客户空间图片"),
      new File(["room"], "room.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("客户空间")).toHaveAttribute(
      "src",
      "https://blob.test/room.png",
    );

    await user.upload(
      screen.getByLabelText("上传整体款式图片"),
      new File(["style"], "style.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("整体款式参考")).toHaveAttribute(
      "src",
      "https://blob.test/style.png",
    );

    await user.click(screen.getByRole("button", { name: "删除材质细节图片" }));
    expect(
      screen.getByRole("button", { name: "AI 识别并生成文案" }),
    ).toBeDisabled();

    await user.upload(
      screen.getByLabelText("上传材质细节图片"),
      new File(["detail"], "detail.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("材质细节参考")).toHaveAttribute(
      "src",
      "https://blob.test/detail.png",
    );

    await user.click(
      screen.getByRole("button", { name: "AI 识别并生成文案" }),
    );
    expect(
      await screen.findByDisplayValue("识别生成的米白双层窗帘模板文案"),
    ).toBeInTheDocument();

    const analysisCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/ai/analyze-materials"),
    );
    expect(JSON.parse(String(analysisCall?.[1]?.body))).toEqual({
      roomImageUrl: "https://blob.test/room.png",
      styleImageUrl: "https://blob.test/style.png",
      detailImageUrl: "https://blob.test/detail.png",
    });

    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    expect(await screen.findByText("效果呈现")).toBeInTheDocument();

    const generationCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith("/api/ai/generate-image") && init?.method === "POST",
    );
    expect(JSON.parse(String(generationCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        roomImageUrl: "https://blob.test/room.png",
        styleImageUrl: "https://blob.test/style.png",
        detailImageUrl: "https://blob.test/detail.png",
      }),
    );

    await user.click(screen.getByRole("button", { name: "保存方案" }));
    const saveCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/plans"),
    );
    expect(JSON.parse(String(saveCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        sampleImageUrl: "https://blob.test/style.png",
        styleImageUrl: "https://blob.test/style.png",
        detailImageUrl: "https://blob.test/detail.png",
        imageAnalysis: expect.stringContaining("明亮的现代客厅"),
      }),
    );
  });

  it("opens the prompt library as a bottom sheet and can replace the prompt", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: /模板库/ }));

    expect(screen.getByRole("dialog", { name: "提示词库" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "客厅现代简约窗帘" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "替换整段" }));

    expect(screen.getByLabelText("生成要求")).toHaveValue(
      "保留客厅原有结构、窗户位置和透视角度，为窗户安装现代简约风格窗帘，强调自然垂感、真实布料纹理、柔和室内光线，整体干净高级。",
    );
    expect(
      screen.queryByRole("dialog", { name: "提示词库" }),
    ).not.toBeInTheDocument();
  });

  it("switches between customer effect and detail tabs", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    await user.click(await screen.findByRole("button", { name: "保存方案" }));

    expect(await screen.findByText("方案展示")).toBeInTheDocument();
    expect(screen.getByText("社交分享方案")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "方案细节" }));

    expect(screen.getByText("方案细节")).toBeInTheDocument();
    expect(screen.getByText("客户：王女士")).toBeInTheDocument();
    expect(screen.getByText("还原度：平衡")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展示效果" }));

    expect(screen.getByText("社交分享方案")).toBeInTheDocument();
  });

  it("opens the effect detail viewer and downloads the real image", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    expect(await screen.findByText("效果呈现")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "放大查看效果图" }),
    );
    expect(
      screen.getByRole("dialog", { name: "查看效果图细节" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "关闭图片查看器" }),
    );

    await user.click(screen.getByRole("button", { name: "下载高清图" }));
    expect(await screen.findByText("高清图已开始下载")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/download?url=%2Fuploads%2Fgenerated-effect.png",
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("shows the backend error when saving a plan fails", async () => {
    const user = userEvent.setup();
    mockApiResponses({ planError: "数据库暂时不可用" });

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    await user.click(await screen.findByRole("button", { name: "保存方案" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "数据库暂时不可用",
    );
    expect(await screen.findByText("效果呈现")).toBeInTheDocument();
  });

  it("uses the final edited prompt after optimization and saves the actual customer and input", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();
    render(<WorkbenchPage />);
    await user.clear(screen.getByLabelText("客户称呼"));
    await user.type(screen.getByLabelText("客户称呼"), "李先生");
    await user.clear(screen.getByLabelText("房间名称"));
    await user.type(screen.getByLabelText("房间名称"), "卧室");
    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "AI 润色" }));
    await screen.findByDisplayValue("优化后的窗帘效果图提示词");
    await user.clear(screen.getByLabelText("生成要求"));
    await user.type(screen.getByLabelText("生成要求"), "蓝色窗帘，保留书桌");
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    await user.click(await screen.findByRole("button", { name: "保存方案" }));
    const generation = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/generate-image") && init?.method === "POST");
    expect(JSON.parse(String(generation?.[1]?.body))).toMatchObject({ optimizedPrompt: "蓝色窗帘，保留书桌", negativePrompt: "" });
    const save = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/plans"));
    expect(JSON.parse(String(save?.[1]?.body))).toMatchObject({ customerName: "李先生", notes: "卧室窗帘方案", originalPrompt: "蓝色窗帘，保留书桌", optimizedPrompt: "蓝色窗帘，保留书桌" });
  });

  it("includes template text inserted after optimization in the generation request", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();
    render(<WorkbenchPage />);
    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "AI 润色" }));
    await screen.findByDisplayValue("优化后的窗帘效果图提示词");
    await user.click(screen.getByRole("button", { name: /模板库/ }));
    await user.click(screen.getByRole("button", { name: "插入到当前" }));
    const finalText = (screen.getByLabelText("生成要求") as HTMLTextAreaElement).value;
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/generate-image") && init?.method === "POST");
    expect(JSON.parse(String(call?.[1]?.body)).optimizedPrompt).toBe(finalText);
    expect(finalText).toContain("现代简约风格窗帘");
  });

  it("shows image generation errors on the requirements step", async () => {
    const user = userEvent.setup();
    mockApiResponses({ generationError: "AI 效果图生成暂时失败，请稍后重试" });
    render(<WorkbenchPage />);
    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("AI 效果图生成暂时失败");
    expect(screen.getByRole("button", { name: "生成方案效果" })).toBeEnabled();
  });

  it("blocks incomplete references and allows restoring the demo inputs", async () => {
    const user = userEvent.setup();
    mockApiResponses();
    render(<WorkbenchPage />);
    await user.click(screen.getByRole("button", { name: "删除材质细节图片" }));
    expect(screen.getByRole("button", { name: "进入下一步" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "恢复示例" }));
    expect(screen.getByRole("button", { name: "进入下一步" })).toBeEnabled();
  });

  it("compares the actual room image and clears copy when a new image is generated", async () => {
    const user = userEvent.setup();
    mockApiResponses();
    render(<WorkbenchPage />);
    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    await user.click(await screen.findByRole("button", { name: "对比原图" }));
    expect(screen.getByAltText("客户空间原图")).toHaveAttribute("src", "/demo/living-room.png");
    await user.click(screen.getByRole("button", { name: "返回效果图" }));
    expect(screen.getByAltText("生成效果图")).toHaveAttribute("src", "/uploads/generated-effect.png");
    await user.click(screen.getByRole("button", { name: "生成营销文案" }));
    await screen.findByText("接口返回的朋友圈文案");
    await user.click(screen.getByRole("button", { name: "生成更多方案" }));
    expect(screen.queryByText("接口返回的朋友圈文案")).not.toBeInTheDocument();
  });

  it("copies the generated text and does not create a duplicate plan on repeated save", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const fetchMock = mockApiResponses();
    render(<WorkbenchPage />);
    await user.click(screen.getByRole("button", { name: "进入下一步" }));
    await user.click(screen.getByRole("button", { name: "生成方案效果" }));
    await user.click(await screen.findByRole("button", { name: "生成营销文案" }));
    await user.click(screen.getByRole("button", { name: "保存方案" }));
    await user.click(await screen.findByRole("button", { name: "复制社交分享方案" }));
    expect(writeText).toHaveBeenCalledWith("接口返回的朋友圈文案");
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: "保存方案" }));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/plans"))).toHaveLength(1);
  });
});

describe("ResultPanel", () => {
  it("shows the generated effect image as a visual result", () => {
    render(
      <ResultPanel
        imageUrl="/uploads/effect.png"
        shortVideoScript=""
        socialCopy=""
        customerScript=""
        onSimilar={() => undefined}
        onMarketing={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(screen.getByAltText("生成效果图")).toHaveAttribute(
      "src",
      "/uploads/effect.png",
    );
    expect(
      screen.getByRole("button", { name: "保存高清图" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "生成前后对比图" }),
    ).toBeInTheDocument();
  });
});
