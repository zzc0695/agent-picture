import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/ai/generate-image": ["./public/demo/**/*"],
    "/api/ai/analyze-materials": ["./public/demo/**/*"],
  },
};

export default nextConfig;
