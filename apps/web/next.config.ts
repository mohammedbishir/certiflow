import type { NextConfig } from "next";

const apiOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.56"],
  transpilePackages: ["pdfjs-dist"],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
