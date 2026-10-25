import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // AVIF first, WebP as the fallback, for every image next/image serves
  // (the homepage's product cards today). Browsers that take neither get
  // the original.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  outputFileTracingIncludes: {
    "/api/search": ["./content/**/*"],
  },
};

export default nextConfig;
