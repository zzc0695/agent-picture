// @vitest-environment node

import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testRoot = path.join(process.cwd(), ".tmp-test-storage");

describe("file storage", () => {
  beforeEach(async () => {
    process.env.LOCAL_FILE_ROOT = testRoot;
    await rm(testRoot, { recursive: true, force: true });
    await mkdir(testRoot, { recursive: true });
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
    delete process.env.LOCAL_FILE_ROOT;
  });

  it("saves uploaded files under the configured upload root", async () => {
    const { saveUploadedFile } = await import("@/lib/files/storage");
    const file = new File(["image-bytes"], "room.png", { type: "image/png" });

    const url = await saveUploadedFile(file);

    expect(url).toMatch(/^\/uploads\/.+\.png$/);
    await expect(
      readFile(path.join(testRoot, url.replace(/^\//, "")), "utf8"),
    ).resolves.toBe("image-bytes");
  });
});
