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
    vi.unstubAllGlobals();
    await rm(testRoot, { recursive: true, force: true });
    delete process.env.LOCAL_FILE_ROOT;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.doUnmock("@vercel/blob");
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

  it("saves uploaded files to Vercel Blob when a blob token is configured", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    const put = vi.fn(async (pathname: string) => ({
      url: `https://blob.example/${pathname}`,
    }));
    vi.doMock("@vercel/blob", () => ({ put }));
    const { saveUploadedFile } = await import("@/lib/files/storage");
    const file = new File(["image-bytes"], "room.png", { type: "image/png" });

    const url = await saveUploadedFile(file);

    expect(url).toMatch(/^https:\/\/blob\.example\/uploads\/.+\.png$/);
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/.+\.png$/),
      expect.any(Buffer),
      {
        access: "public",
        contentType: "image/png",
      },
    );
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

  it("keeps non-Blob public URLs and converts local uploads to data URLs", async () => {
    const { saveGeneratedImage, toBailianImageReference } = await import(
      "@/lib/files/storage"
    );
    const localUrl = await saveGeneratedImage(Buffer.from("room-bytes"), "jpg");

    await expect(
      toBailianImageReference("https://blob.example/room.png"),
    ).resolves.toBe("https://blob.example/room.png");
    await expect(toBailianImageReference(localUrl)).resolves.toBe(
      "data:image/jpeg;base64," + Buffer.from("room-bytes").toString("base64"),
    );
  });

  it("fetches Vercel Blob images and converts them to data URLs", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(Buffer.from("blob-image"), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { toBailianImageReference } = await import("@/lib/files/storage");

    await expect(
      toBailianImageReference(
        "https://example.public.blob.vercel-storage.com/uploads/room.png",
      ),
    ).resolves.toBe(
      "data:image/png;base64," + Buffer.from("blob-image").toString("base64"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.public.blob.vercel-storage.com/uploads/room.png",
      { cache: "no-store" },
    );
  });

  it("rejects unsupported Vercel Blob image types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(Buffer.from("gif-image"), {
          status: 200,
          headers: { "Content-Type": "image/gif" },
        }),
      ),
    );
    const { toBailianImageReference } = await import("@/lib/files/storage");

    await expect(
      toBailianImageReference(
        "https://example.public.blob.vercel-storage.com/uploads/room.gif",
      ),
    ).rejects.toThrow("图片格式不支持，请使用 JPG、PNG 或 WebP");
  });

  it("rejects Vercel Blob images larger than 7 MiB", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(Buffer.alloc(7 * 1024 * 1024 + 1), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        }),
      ),
    );
    const { toBailianImageReference } = await import("@/lib/files/storage");

    await expect(
      toBailianImageReference(
        "https://example.public.blob.vercel-storage.com/uploads/room.jpg",
      ),
    ).rejects.toThrow("单张图片不能超过 7MB");
  });
});
