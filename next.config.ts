import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["playcanvas"],
  turbopack: {},
  async headers() {
    const javascript = [
      {
        key: "Content-Type",
        value: "text/javascript; charset=utf-8",
      },
    ];
    return [
      { source: "/maplibre-gl-worker.mjs", headers: javascript },
      { source: "/maplibre-gl-shared.mjs", headers: javascript },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
