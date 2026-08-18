import { describe, expect, it } from "vitest";

import packageJson from "../package.json";

describe("production build script", () => {
  it("deploys migrations before generating Prisma and building Next.js", () => {
    expect(packageJson.scripts.build).toBe(
      "prisma migrate deploy && prisma generate && next build",
    );
  });
});
