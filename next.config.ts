import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/search": ["./content/**/*"],
  },
};

export default nextConfig;
