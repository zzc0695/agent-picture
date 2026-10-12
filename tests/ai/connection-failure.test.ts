import { describe, it, expect } from "vitest";
import { isPreRequestConnectionFailure } from "@/lib/ai/errors";
describe("submission retry boundaries", () => {
  it("accepts only known failures before the HTTP request can be sent", () => {
    expect(isPreRequestConnectionFailure(new TypeError("failed",{cause:{code:"UND_ERR_CONNECT_TIMEOUT"}}))).toBe(true);
    expect(isPreRequestConnectionFailure(new TypeError("failed",{cause:{code:"ETIMEDOUT",errors:[{code:"ETIMEDOUT",syscall:"connect"}]}}))).toBe(true);
    expect(isPreRequestConnectionFailure(new TypeError("failed",{cause:{code:"ETIMEDOUT",syscall:"read"}}))).toBe(false);
    expect(isPreRequestConnectionFailure(new TypeError("failed",{cause:{code:"ECONNRESET"}}))).toBe(false);
    expect(isPreRequestConnectionFailure(new Error("timeout"))).toBe(false);
  });
});
