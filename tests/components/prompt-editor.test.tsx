import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PromptEditor } from "@/components/prompt-editor";

describe("PromptEditor", () => {
  it("supports replacing the current prompt", async () => {
    const user = userEvent.setup();
    render(
      <PromptEditor
        value="原始内容"
        onChange={() => undefined}
        testTemplate="模板内容"
      />,
    );

    await user.click(screen.getByRole("button", { name: "替换整段" }));

    expect(screen.getByLabelText("生成要求")).toHaveValue("模板内容");
  });
});
