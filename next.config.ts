import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only needed for the Docker image; `next start` (used by e2e) warns with it.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
