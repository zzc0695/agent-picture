import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewImage } from "@/components/preview-image";

describe("preview delivery", () => {
  it("serves responsive optimized previews for our store", () => {
    render(<PreviewImage src="https://dse5b6qlu1bnqy9z.public.blob.vercel-storage.com/uploads/room.png" alt="preview" sizes="30vw" />);
    const image = screen.getByAltText("preview");
    expect(image.getAttribute("src")).toContain("/_next/image?");
    expect(image.getAttribute("srcset")).toContain("640w");
    expect(image).toHaveAttribute("sizes", "30vw");
  });
  it("keeps local upload previews immediate and external URLs untouched", () => {
    render(<><PreviewImage src="blob:local-upload" alt="local" /><PreviewImage src="https://other.example/image.jpg" alt="external" /></>);
    expect(screen.getByAltText("local")).toHaveAttribute("src", "blob:local-upload");
    expect(screen.getByAltText("local")).not.toHaveAttribute("srcset");
    expect(screen.getByAltText("external")).toHaveAttribute("src", "https://other.example/image.jpg");
  });
});
