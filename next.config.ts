import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "dse5b6qlu1bnqy9z.public.blob.vercel-storage.com" }],
    formats: ["image/webp"],
    qualities: [75],
    minimumCacheTTL: 2592000,
  },
  outputFileTracingIncludes: {
    "/api/ai/generate-image": ["./public/demo/**/*"],
    "/api/ai/analyze-materials": ["./public/demo/**/*"],
  },
};

export default nextConfig;
