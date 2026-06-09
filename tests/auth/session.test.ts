// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "@/lib/auth/session";

describe("session tokens", () => {
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
