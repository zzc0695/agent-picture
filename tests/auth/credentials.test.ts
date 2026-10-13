// @vitest-environment node
import { expect, it, vi } from "vitest";
const setCookie = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({cookies: async () => ({set:setCookie})}));
import { signIn } from "@/lib/auth/credentials";
import { readSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
it("persists the browser session for the same period as its verified token", async () => {
  await signIn({merchantId:"merchant",email:"shop@example.com"});
  const [name, token, options] = setCookie.mock.calls[0];
  expect(name).toBe("merchant_session");
  expect(options).toMatchObject({httpOnly:true,sameSite:"lax",path:"/",maxAge:SESSION_MAX_AGE_SECONDS});
  expect(await readSessionToken(token)).toEqual({merchantId:"merchant",email:"shop@example.com"});
});
