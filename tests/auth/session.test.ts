// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { decodeJwt } from "jose";
import { createSessionToken, readSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

describe("session tokens", () => {
  it("remains valid inside the fixed 30-day period and expires at its end", async () => {
    vi.useFakeTimers();
    try {
      const start = new Date("2026-10-13T00:00:00Z"); vi.setSystemTime(start);
      const token = await createSessionToken({merchantId:"m",email:"demo@example.com"});
      const claims = decodeJwt(token);
      expect(claims.exp! - claims.iat!).toBe(SESSION_MAX_AGE_SECONDS);
      vi.setSystemTime(start.getTime() + 29 * 24 * 3600 * 1000);
      expect(await readSessionToken(token)).not.toBeNull();
      vi.setSystemTime(start.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
      expect(await readSessionToken(token)).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it("round trips merchant identity", async () => {
    const token = await createSessionToken({
      merchantId: "m_123",
      email: "demo@example.com",
    });

    await expect(readSessionToken(token)).resolves.toMatchObject({
      merchantId: "m_123",
      email: "demo@example.com",
    });
  });

  it("rejects malformed tokens", async () => {
    await expect(readSessionToken("broken")).resolves.toBeNull();
  });
});
