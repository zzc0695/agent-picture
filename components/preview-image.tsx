/* eslint-disable @next/next/no-img-element */
import { getImageProps } from "next/image";
import type { ImgHTMLAttributes } from "react";

// Keep local file previews immediate and unknown external hosts untouched.
// Only our public store and bundled demos may use the cached image optimizer.
export function PreviewImage({ src, alt = "", sizes = "(max-width: 640px) 100vw, 640px", loading = "lazy", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  let optimizable = src.startsWith("/demo/");
  try {
    const url = new URL(src);
    optimizable = url.protocol === "https:" && url.hostname === "dse5b6qlu1bnqy9z.public.blob.vercel-storage.com";
  } catch { /* Local paths and blob object URLs bypass optimization. */ }
  const optimized = optimizable ? getImageProps({ src, alt, width: 1024, height: 1024, sizes, quality: 75 }).props : null;
  return <img {...rest} src={optimized?.src ?? src} srcSet={optimized?.srcSet} sizes={optimized ? sizes : undefined} alt={alt} loading={loading} decoding="async" />;
}
