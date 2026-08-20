import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageViewer } from "@/components/image-viewer";

describe("ImageViewer", () => {
  it("opens as an accessible dialog and exposes detail controls", () => {
    render(
      <ImageViewer
        imageUrl="/uploads/effect.png"
        open
        onClose={() => undefined}
        onDownload={() => undefined}
        downloading={false}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "查看效果图细节" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("效果图细节")).toHaveAttribute(
      "src",
      "/uploads/effect.png",
    );
    expect(screen.getByTestId("zoom-value")).toHaveTextContent("100%");
  });

  it("zooms, resets, and calls the download action", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(
      <ImageViewer
        imageUrl="/uploads/effect.png"
        open
        onClose={() => undefined}
        onDownload={onDownload}
        downloading={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "放大" }));
    expect(screen.getByTestId("zoom-value")).toHaveTextContent("125%");

    await user.click(screen.getByRole("button", { name: "复位" }));
    expect(screen.getByTestId("zoom-value")).toHaveTextContent("100%");

    await user.click(screen.getByRole("button", { name: "下载高清图" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("closes from the close button and Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ImageViewer
        imageUrl="/uploads/effect.png"
        open
        onClose={onClose}
        onDownload={() => undefined}
        downloading={false}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "关闭图片查看器" }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not render while closed", () => {
    render(
      <ImageViewer
        imageUrl="/uploads/effect.png"
        open={false}
        onClose={() => undefined}
        onDownload={() => undefined}
        downloading={false}
      />,
    );

    expect(
      screen.queryByRole("dialog", { name: "查看效果图细节" }),
    ).not.toBeInTheDocument();
  });
});
