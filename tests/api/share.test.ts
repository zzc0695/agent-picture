// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST, DELETE } from "@/app/api/plans/[id]/share/route";
import { publicPlan } from "@/lib/plans";
import { db } from "@/lib/db";
vi.mock("@/lib/db", () => ({ db: { customerPlan: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() } } }));
vi.mock("@/lib/auth/require-session", () => ({ requireMerchantSession: vi.fn(async () => ({ merchantId: "owner" })), unauthorizedResponse: () => Response.json({}, { status: 401 }) }));
const params = { params: Promise.resolve({ id: "plan" }) };
const request = new Request("http://local");
beforeEach(() => vi.clearAllMocks());
it("scopes share creation to the merchant", async () => {
  vi.mocked(db.customerPlan.findFirst).mockResolvedValue(null);
  expect((await POST(request, params)).status).toBe(404);
  expect(db.customerPlan.findFirst).toHaveBeenCalledWith({ where: { id: "plan", merchantId: "owner" } });
  expect(db.customerPlan.update).not.toHaveBeenCalled();
});
it("creates an unpredictable expiring token and reuses an active link", async () => {
  vi.mocked(db.customerPlan.findFirst).mockResolvedValue({ primaryImageUrl: "https://image" } as never);
  const result = await (await POST(request, params)).json();
  expect(result.path).toMatch(/^\/share\/[a-f0-9]{48}$/);
  expect(new Date(result.expiresAt).getTime() - Date.now()).toBeGreaterThan(6.9 * 86400000);
  vi.mocked(db.customerPlan.findFirst).mockResolvedValue({ primaryImageUrl: "https://image", shareToken: "active", shareExpiresAt: new Date(result.expiresAt) } as never);
  expect(await (await POST(request, params)).json()).toMatchObject({ path: "/share/active" });
});
it("revokes only owned links and public lookup excludes internal data", async () => {
  vi.mocked(db.customerPlan.updateMany).mockResolvedValue({ count: 1 });
  expect((await DELETE(request, params)).status).toBe(200);
  expect(db.customerPlan.updateMany).toHaveBeenCalledWith({ where: { id: "plan", merchantId: "owner" }, data: { shareToken: null, shareExpiresAt: null } });
  await publicPlan("token");
  expect(db.customerPlan.findFirst).toHaveBeenLastCalledWith({ where: { shareToken: "token", shareExpiresAt: { gt: expect.any(Date) } }, select: { customerName: true, roomImageUrl: true, primaryImageUrl: true, customerScript: true } });
});
