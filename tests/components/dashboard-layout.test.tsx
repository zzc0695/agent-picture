import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "@/app/(dashboard)/layout";
import { requirePageMerchantSession } from "@/lib/auth/require-session";

vi.mock("@/lib/auth/require-session", () => ({
  requirePageMerchantSession: vi.fn(async () => ({
    merchantId: "merchant_1",
    email: "demo@example.com",
  })),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a merchant session before rendering dashboard pages", async () => {
    render(
      await DashboardLayout({
        children: <div>工作台内容</div>,
      }),
    );

    expect(requirePageMerchantSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText("工作台内容")).toBeInTheDocument();
  });
});
