// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/materials/[id]/route";
import { GET } from "@/app/api/materials/route";
import { db } from "@/lib/db";
vi.mock("@/lib/auth/require-session", () => ({ requireMerchantSession: vi.fn(async () => ({ merchantId: "owner" })), unauthorizedResponse: () => Response.json({}, { status: 401 }) }));
vi.mock("@/lib/db", () => ({ db: { material: { findMany: vi.fn(async () => []), findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() } } }));
beforeEach(() => vi.clearAllMocks());
const context = { params: Promise.resolve({ id: "material" }) };
it("lists only the signed-in account's materials", async () => {
  await GET(); expect(db.material.findMany).toHaveBeenCalledWith({ where: { merchantId: "owner" }, orderBy: { createdAt: "desc" } });
});
it("cannot update a material belonging to another account", async () => {
  vi.mocked(db.material.updateMany).mockResolvedValue({ count: 0 });
  expect((await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ name: "Changed" }) }), context)).status).toBe(404);
  expect(db.material.updateMany).toHaveBeenCalledWith({ where: { id: "material", merchantId: "owner" }, data: { name: "Changed" } });
  expect(db.material.findFirst).not.toHaveBeenCalled();
});
it("cannot delete a material belonging to another account", async () => {
  vi.mocked(db.material.deleteMany).mockResolvedValue({ count: 0 });
  expect((await DELETE(new Request("http://local"), context)).status).toBe(404);
  expect(db.material.deleteMany).toHaveBeenCalledWith({ where: { id: "material", merchantId: "owner" } });
});
