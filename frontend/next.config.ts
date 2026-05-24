import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendBaseUrl =
      process.env.BACKEND_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:8080";

    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendBaseUrl.replace(/\/$/, "")}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
