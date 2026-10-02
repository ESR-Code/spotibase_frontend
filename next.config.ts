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
      // WSL / bind-mount inotify is unreliable, so we poll — but only the
      // source tree. Polling node_modules (PlayCanvas is transpiled) and
      // .next every second stalls the event loop and drops localhost:3000.
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 600,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/worker/**",
          "**/.cursor/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
