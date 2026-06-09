import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import WorkbenchPage from "@/app/(dashboard)/page";
import { ResultPanel } from "@/components/result-panel";

describe("WorkbenchPage", () => {
  it("renders the mobile proposal flow from the design reference", async () => {
    const user = userEvent.setup();

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
