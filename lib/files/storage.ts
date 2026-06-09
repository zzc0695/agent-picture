import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
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
