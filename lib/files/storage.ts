import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const MAX_BAILIAN_IMAGE_BYTES = 7 * 1024 * 1024;
const BAILIAN_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class MaterialImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialImageInputError";
  }
}

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

function validatedImageDataUrl(bytes: Buffer, contentType: string) {
  const normalizedType = contentType.toLowerCase().split(";", 1)[0].trim();

  if (!BAILIAN_IMAGE_TYPES.has(normalizedType)) {
    throw new MaterialImageInputError(
      "图片格式不支持，请使用 JPG、PNG 或 WebP",
    );
  }

  if (bytes.byteLength > MAX_BAILIAN_IMAGE_BYTES) {
    throw new MaterialImageInputError("单张图片不能超过 7MB");
  }

  return `data:${normalizedType};base64,${bytes.toString("base64")}`;
}

function isVercelBlobUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

async function readVercelBlobImage(imageUrl: string) {
  let response: Response;

  try {
    response = await fetch(imageUrl, { cache: "no-store" });
  } catch {
    throw new MaterialImageInputError("参考图片读取失败，请稍后重试");
  }

  if (!response.ok) {
    throw new MaterialImageInputError("参考图片读取失败，请稍后重试");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BAILIAN_IMAGE_BYTES) {
    throw new MaterialImageInputError("单张图片不能超过 7MB");
  }

  return validatedImageDataUrl(
    Buffer.from(await response.arrayBuffer()),
    contentType,
  );
}

export async function toBailianImageReference(imageUrl: string) {
  if (isVercelBlobUrl(imageUrl)) {
    return readVercelBlobImage(imageUrl);
  }

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

  return validatedImageDataUrl(image.bytes, image.contentType);
}
