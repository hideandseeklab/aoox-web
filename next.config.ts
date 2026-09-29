import type { NextConfig } from "next"
import pkg from "./package.json" with { type: "json" }

const nextConfig: NextConfig = {
  // Inlined at build time; the sidebar tooltip compares it with the API's.
  env: { NEXT_PUBLIC_WEB_VERSION: pkg.version },
  // Minimal server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  turbopack: {
    // Pin the root so a stray lockfile in a parent directory can't change it.
    root: import.meta.dirname,
  },
}

export default nextConfig
