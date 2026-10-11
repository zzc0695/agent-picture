// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { POST } from "@/app/api/auth/register/route";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth/credentials";
vi.mock("@/lib/db", () => ({ db: { merchant: { create: vi.fn() } } }));
vi.mock("@/lib/auth/credentials", async original => ({ ...await original<typeof import("@/lib/auth/credentials")>(), signIn: vi.fn() }));
const request = (body: unknown) => new Request("http://local/api/auth/register", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => vi.clearAllMocks());
it("normalizes the email, hashes the password and signs in a new account", async () => {
  vi.mocked(db.merchant.create).mockResolvedValue({ id: "new", email: "shop@example.com" } as never);
  expect((await POST(request({ name: " 店铺 ", email: " SHOP@Example.com ", password: "password123" }))).status).toBe(201);
  const data = vi.mocked(db.merchant.create).mock.calls[0][0].data;
  expect(data).toMatchObject({ name: "店铺", email: "shop@example.com", onboarded: false });
  expect(await bcrypt.compare("password123", data.passwordHash)).toBe(true);
  expect(signIn).toHaveBeenCalledWith({ merchantId: "new", email: "shop@example.com" });
});
it("rejects duplicate email without signing in", async () => {
  vi.mocked(db.merchant.create).mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7" }));
  expect((await POST(request({ name: "店铺", email: "shop@example.com", password: "password123" }))).status).toBe(409);
  expect(signIn).not.toHaveBeenCalled();
});
it("rejects weak or bcrypt-truncated passwords", async () => {
  for (const password of ["short", "中".repeat(25)]) expect((await POST(request({ name: "店铺", email: "shop@example.com", password }))).status).toBe(400);
  expect(db.merchant.create).not.toHaveBeenCalled();
});
