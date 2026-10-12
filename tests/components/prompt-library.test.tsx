import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PromptLibrary } from "@/components/prompt-library";

const templates = [
  { id: "1", title: "客厅搭配", category: "现代", body: "保留书桌，使用浅灰窗帘", isSystem: true },
  { id: "2", title: "卧室搭配", category: "自然", body: "暖色亚麻", isSystem: false },
];

describe("prompt library", () => {
  it("combines body search with category filtering and recovers from an empty result", async () => {
    const user = userEvent.setup(); render(<PromptLibrary templates={templates} />);
    await user.type(screen.getByLabelText("搜索提示词"), "书桌");
    expect(screen.getByText("客厅搭配")).toBeInTheDocument();
    expect(screen.queryByText("卧室搭配")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("提示词分类"), "自然");
    expect(screen.getByText("没有找到匹配模板")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(screen.getByText("卧室搭配")).toBeInTheDocument();
  });
  it("copies the complete template and offers selectable text if clipboard access fails", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    render(<PromptLibrary templates={templates} />);
    await user.click(screen.getByRole("button", { name: "复制客厅搭配" }));
    expect(write).toHaveBeenCalledWith(templates[0].body);
    expect(screen.getByText("已复制")).toBeInTheDocument();
    write.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "复制卧室搭配" }));
    expect(screen.getByLabelText("手动复制提示词")).toHaveValue(templates[1].body);
  });
});
