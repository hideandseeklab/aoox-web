import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import pkg from "./package.json" with { type: "json" }

const withNextIntl = createNextIntlPlugin()

/**
 * Dev only: hosts (no scheme or port) the dev server may be opened from besides
 * localhost, from the comma-separated env `AOOX_DEV_ORIGINS`. Next 16 blocks the
 * client bundle and the HMR socket for any other origin (a LAN IP, a tunnel),
 * which shows up as dead selects and tabs. Empty in production builds.
 */
function devOrigins(): string[] {
  if (process.env.NODE_ENV === "production") return []
  return (process.env.AOOX_DEV_ORIGINS ?? "")
    .split(",")
    .map((entry) =>
      entry
        .trim()
        .replace(/^[a-z]+:\/\//i, "")
        .replace(/[/:].*$/, "")
    )
    .filter(Boolean)
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins(),
  // Inlined at build time; the sidebar tooltip compares it with the API's.
  env: { NEXT_PUBLIC_WEB_VERSION: pkg.version },
  // Minimal server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  turbopack: {
    // Pin the root so a stray lockfile in a parent directory can't change it.
    root: import.meta.dirname,
  },
}

export default withNextIntl(nextConfig)
