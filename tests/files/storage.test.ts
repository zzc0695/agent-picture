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

  it("accepts image file extensions when multipart MIME is missing", async () => {
    const { isSupportedImageFile } = await import("@/lib/files/storage");
    const file = new File(["image-bytes"], "room.png", { type: "" });

    expect(isSupportedImageFile(file)).toBe(true);
  });

  it("saves generated image bytes under the upload root", async () => {
    const { saveGeneratedImage } = await import("@/lib/files/storage");

    const url = await saveGeneratedImage(Buffer.from("generated"), "png");

    expect(url).toMatch(/^\/uploads\/.+\.png$/);
    await expect(
      readFile(path.join(testRoot, url.replace(/^\//, "")), "utf8"),
    ).resolves.toBe("generated");
  });

  it("reads stored upload bytes by file name", async () => {
    const { readStoredUpload, saveGeneratedImage } = await import(
      "@/lib/files/storage"
    );
    const url = await saveGeneratedImage(Buffer.from("stored-upload"), "png");
    const fileName = path.basename(url);

    const stored = await readStoredUpload(fileName);

    expect(stored).toMatchObject({
      contentType: "image/png",
    });
    expect(stored?.bytes.toString("utf8")).toBe("stored-upload");
  });

  it("does not read paths outside the upload root", async () => {
    const { readStoredUpload } = await import("@/lib/files/storage");

    await expect(readStoredUpload("../secret.png")).resolves.toBeNull();
  });
});
