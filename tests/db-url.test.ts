// @vitest-environment node

import { describe, expect, it } from "vitest";

import { getDatabaseUrl } from "@/lib/db-url";

describe("getDatabaseUrl", () => {
  it("prefers DATABASE_URL when both variables are set", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgresql://primary.example/app",
        STORAGE_URL: "postgresql://neon.example/app",
      }),
    ).toBe("postgresql://primary.example/app");
  });

  it("uses STORAGE_URL from the Neon integration when DATABASE_URL is absent", () => {
    expect(getDatabaseUrl({ STORAGE_URL: "postgresql://neon.example/app" })).toBe(
      "postgresql://neon.example/app",
    );
  });

  it("throws the existing configuration error when no database URL is available", () => {
    expect(() => getDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });
});
