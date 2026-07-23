import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

function storageRoot() {
  return process.env.LOCAL_FILE_ROOT ?? "./storage";
}

export function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;

  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
    path.extname(file.name).toLowerCase(),
  );
}

function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function contentTypeForExtension(extension: string) {
  const normalized = extension.toLowerCase();
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".webp") return "image/webp";
  if (normalized === ".gif") return "image/gif";
  return "image/png";
}

async function saveLocalUpload(fileName: string, bytes: Buffer) {
  const absoluteDir = path.resolve(storageRoot(), "uploads");

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), bytes);

  return `/uploads/${fileName}`;
}

async function saveBlobUpload(
  fileName: string,
  bytes: Buffer,
  contentType: string,
) {
  const blob = await put(`uploads/${fileName}`, bytes, {
    access: "public",
    contentType,
  });

  return blob.url;
}

export async function saveUploadedFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const contentType = file.type || contentTypeForExtension(extension);

  if (isBlobStorageEnabled()) {
    return saveBlobUpload(fileName, bytes, contentType);
  }

  return saveLocalUpload(fileName, bytes);
}

export async function saveGeneratedImage(bytes: Buffer, format = "png") {
  const safeFormat = format.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const extension = safeFormat === "jpeg" ? "jpg" : safeFormat;
  const fileName = `${crypto.randomUUID()}.${extension}`;

  if (isBlobStorageEnabled()) {
    return saveBlobUpload(fileName, bytes, contentTypeForExtension(`.${extension}`));
  }

  return saveLocalUpload(fileName, bytes);
}

export async function readStoredUpload(fileName: string) {
  if (fileName !== path.basename(fileName)) return null;

  const extension = path.extname(fileName).toLowerCase();
  const contentType = contentTypeForExtension(extension);
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

async function readPublicImage(imageUrl: string) {
  if (!imageUrl.startsWith("/")) return null;

  const publicRoot = path.resolve("public");
  const relativePath = imageUrl.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicRoot, relativePath);

  if (
    absolutePath !== publicRoot &&
    !absolutePath.startsWith(publicRoot + path.sep)
  ) {
    return null;
  }

  try {
    return {
      bytes: await readFile(absolutePath),
      contentType: contentTypeForExtension(path.extname(absolutePath)),
    };
  } catch {
    return null;
  }
}

export async function toBailianImageReference(imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  const upload = imageUrl.startsWith("/uploads/")
    ? await readStoredUpload(path.basename(imageUrl))
    : null;
  const image = upload ?? (await readPublicImage(imageUrl));

  if (!image) {
    throw new Error("无法读取用于图片生成的参考图");
  }

  return "data:" + image.contentType + ";base64," + image.bytes.toString("base64");
}
