const VERCEL_BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function resolveDownloadUrl(value: string, origin: string) {
  let url: URL;

  try {
    url = new URL(value, origin);
  } catch {
    throw new Error("图片地址无效");
  }

  const sameOriginUpload =
    url.origin === origin && url.pathname.startsWith("/uploads/");
  const vercelBlob =
    url.protocol === "https:" &&
    url.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX);

  if (!sameOriginUpload && !vercelBlob) {
    throw new Error("不允许下载该图片来源");
  }

  return url;
}

export function downloadFileName(contentType: string, now = new Date()) {
  const extension = contentType.includes("jpeg")
    ? "jpg"
    : contentType.includes("webp")
      ? "webp"
      : "png";
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");

  return `curtain-plan-${date}.${extension}`;
}
