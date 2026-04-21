import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "pitch.hashpay.tech" }],
        destination: "/pitch.html",
      },
    ];
  },
};

export default nextConfig;
