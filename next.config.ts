import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Minimal server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  turbopack: {
    // Pin the root so a stray lockfile in a parent directory can't change it.
    root: import.meta.dirname,
  },
}

export default nextConfig
