import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function storageRoot() {
  return process.env.LOCAL_FILE_ROOT ?? "./storage";
}

export function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;

  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
    path.extname(file.name).toLowerCase(),
  );
}

export async function saveUploadedFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const absoluteDir = path.resolve(storageRoot(), "uploads");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), bytes);

  return `/uploads/${fileName}`;
}

export async function saveGeneratedImage(bytes: Buffer, format = "png") {
  const safeFormat = format.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const extension = safeFormat === "jpeg" ? "jpg" : safeFormat;
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const absoluteDir = path.resolve(storageRoot(), "uploads");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), bytes);

  return `/uploads/${fileName}`;
}

export async function readStoredUpload(fileName: string) {
  if (fileName !== path.basename(fileName)) return null;

  const extension = path.extname(fileName).toLowerCase();
  const contentType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : "image/png";
  const absolutePath = path.resolve(storageRoot(), "uploads", fileName);
  const uploadRoot = path.resolve(storageRoot(), "uploads");

  if (!absolutePath.startsWith(uploadRoot + path.sep)) return null;

  try {
    return {
      bytes: await readFile(absolutePath),
      contentType,
    };
  } catch {
    return null;
  }
}
