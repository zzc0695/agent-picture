import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkbenchPage from "@/app/(dashboard)/page";
import { ResultPanel } from "@/components/result-panel";

function mockApiResponses() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/api/ai/optimize-prompt")) {
      return Response.json({
        optimizedPrompt: "优化后的窗帘效果图提示词",
        negativePrompt: "避免窗户变形",
      });
    }

    if (url.endsWith("/api/ai/generate-image")) {
      return Response.json({
        imageUrl: "/uploads/generated-effect.png",
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
      return Response.json(
        { plan: { id: "plan_1", customerName: "王女士" } },
        { status: 201 },
      );
    }

    return Response.json({}, { status: 404 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("WorkbenchPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the mobile proposal flow from the design reference", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<WorkbenchPage />);

    expect(screen.getByText("王女士 · 客厅窗帘方案")).toBeInTheDocument();
    expect(screen.getByText("房间图")).toBeInTheDocument();
    expect(screen.getByText("样本")).toBeInTheDocument();
    expect(screen.getByText("要求")).toBeInTheDocument();
    expect(screen.getByText("出图")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保存草稿" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "下一步：生成要求" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一步：生成要求" }));
    expect(screen.getByRole("heading", { name: "生成要求" })).toBeInTheDocument();
    expect(screen.getByText("从提示词库选择")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成效果图" }));
    expect(screen.getByRole("heading", { name: "生成结果" })).toBeInTheDocument();
    expect(screen.getByText("本次生成条件")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存方案" }));
    expect(screen.getByRole("heading", { name: "客户展示" })).toBeInTheDocument();
    expect(screen.getByText("朋友圈文案")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "分享给客户" }),
    ).toBeInTheDocument();
  });

  it("uses backend APIs for optimization, generation, marketing, and saving", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "下一步：生成要求" }));
    await user.click(screen.getByRole("button", { name: "优化提示词" }));
    expect(await screen.findByDisplayValue("优化后的窗帘效果图提示词")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成效果图" }));
    expect(await screen.findByRole("heading", { name: "生成结果" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "营销内容" }));
    expect(await screen.findByText("接口返回的朋友圈文案")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存方案" }));
    expect(await screen.findByRole("heading", { name: "客户展示" })).toBeInTheDocument();
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

  it("opens the prompt library as a bottom sheet and can replace the prompt", async () => {
    const user = userEvent.setup();
    mockApiResponses();

    render(<WorkbenchPage />);

    await user.click(screen.getByRole("button", { name: "下一步：生成要求" }));
    await user.click(screen.getByRole("button", { name: /从提示词库选择/ }));

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

    await user.click(screen.getByRole("button", { name: "下一步：生成要求" }));
    await user.click(screen.getByRole("button", { name: "生成效果图" }));
    await user.click(await screen.findByRole("button", { name: "保存方案" }));

    expect(await screen.findByRole("heading", { name: "客户展示" })).toBeInTheDocument();
    expect(screen.getByText("朋友圈文案")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "方案详情" }));

    expect(screen.getByRole("heading", { name: "方案详情" })).toBeInTheDocument();
    expect(screen.getByText("客户：王女士")).toBeInTheDocument();
    expect(screen.getByText("还原度：平衡")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "方案效果" }));

    expect(screen.getByText("朋友圈文案")).toBeInTheDocument();
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
