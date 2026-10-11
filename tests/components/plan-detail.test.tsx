import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PlanDetailPage from "@/app/(dashboard)/plans/[id]/page";
import { CustomerPlanCard } from "@/components/customer-plan-card";

const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { customerPlan: { findFirst }, customer: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/lib/auth/require-session", () => ({ requirePageMerchantSession: vi.fn(async () => ({ merchantId: "owner" })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), notFound: () => { throw new Error("NOT_FOUND"); } }));
beforeEach(() => vi.clearAllMocks());

it("opens saved content from the plan card and scopes the detail lookup to the signed-in merchant", async () => {
  const plan = { id: "plan_1", customerName: "李先生", notes: "卧室", status: "ready", createdAt: "2026-10-11T12:00:00Z", roomImageUrl: "/uploads/room.jpg", primaryImageUrl: "/uploads/result.png", optimizedPrompt: "蓝色窗帘", originalPrompt: "窗帘", fidelity: "strict", socialCopy: "已保存社交文案", shortVideoScript: null, customerScript: null };
  findFirst.mockResolvedValue(plan);
  render(<CustomerPlanCard plan={plan} />);
  expect(screen.getByRole("link", { name: "查看李先生的卧室" })).toHaveAttribute("href", "/plans/plan_1");
  render(await PlanDetailPage({ params: Promise.resolve({ id: "plan_1" }) }));
  expect(findFirst).toHaveBeenCalledWith({ where: { id: "plan_1", merchantId: "owner" } });
  expect(screen.getByAltText("已保存的效果图")).toHaveAttribute("src", "/uploads/result.png");
  expect(screen.getByText("已保存社交文案", { selector: "p" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "下载高清图" })).toHaveAttribute("href", "/api/files/download?url=%2Fuploads%2Fresult.png");
});

it("does not display a missing or another merchant's plan", async () => {
  findFirst.mockResolvedValue(null);
  await expect(PlanDetailPage({ params: Promise.resolve({ id: "other" }) })).rejects.toThrow("NOT_FOUND");
});
