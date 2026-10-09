import {
  Box,
  DatabaseZap,
  FileCode2,
  GitBranch,
  Globe,
  Layers,
  Package,
  Train,
  type LucideIcon,
} from "lucide-react"
import { BRAND_PATHS } from "@/components/custom/brand-paths"
import type { BuildType, SourceType } from "@/features/application/application.entity"
import { cn } from "@/lib/utils"

/** A simple-icons glyph in the current text colour (not the brand colour, so the theme stays uniform). */
export function BrandIcon({
  name,
  className,
}: {
  name: keyof typeof BRAND_PATHS
  className?: string
}) {
  const brand = BRAND_PATHS[name]
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-3.5 shrink-0", className)}
    >
      <path d={brand.d} />
    </svg>
  )
}

function Glyph({
  icon: Icon,
  className,
}: {
  icon: LucideIcon
  className?: string
}) {
  return (
    <Icon
      aria-hidden="true"
      className={cn("size-3.5 shrink-0", className)}
    />
  )
}

/** Logo of a database engine (pgvector/PostGIS/TimescaleDB are Postgres); Valkey has no glyph in simple-icons. */
export function EngineIcon({
  engine,
  className,
}: {
  engine: string
  className?: string
}) {
  switch (engine) {
    case "postgres":
      return <BrandIcon name="postgresql" className={className} />
    case "mysql":
    case "mariadb":
    case "redis":
    case "mongodb":
      return <BrandIcon name={engine} className={className} />
    default:
      return <Glyph icon={DatabaseZap} className={className} />
  }
}

/** Host of a git/image URL or reference, lower-cased; null when there is none. */
function hostOf(url: string): string | null {
  const m = /^(?:[a-z+]+:\/\/)?(?:[^@/]*@)?([^/:]+)/i.exec(url.trim())
  return m ? m[1].toLowerCase() : null
}

/** Git provider glyph from the repository URL (GitHub, GitLab, Bitbucket, otherwise plain git). */
export function GitProviderIcon({
  url,
  className,
}: {
  url: string | null | undefined
  className?: string
}) {
  const host = url ? hostOf(url) : null
  if (host?.includes("github")) return <BrandIcon name="github" className={className} />
  if (host?.includes("gitlab")) return <BrandIcon name="gitlab" className={className} />
  if (host?.includes("bitbucket")) return <BrandIcon name="bitbucket" className={className} />
  return <BrandIcon name="git" className={className} />
}

/** Registry of an image reference: no host or docker.io = Docker Hub, ghcr.io = GitHub, anything else a generic package. */
export function ImageRegistryIcon({
  imageRef,
  className,
}: {
  imageRef: string | null | undefined
  className?: string
}) {
  const first = (imageRef ?? "").split("/")[0]
  const hasHost = first.includes(".") || first.includes(":") || first === "localhost"
  if (!hasHost || first === "docker.io" || first.endsWith("docker.io"))
    return <BrandIcon name="docker" className={className} />
  if (first === "ghcr.io") return <BrandIcon name="github" className={className} />
  return <Glyph icon={Package} className={className} />
}

const BUILD_ICON: Record<BuildType, LucideIcon> = {
  dockerfile: FileCode2,
  nixpacks: Box,
  railpack: Train,
  static: Globe,
}

/** Where an application comes from: the image registry, or the git provider; a generic build-type icon when neither is known. */
export function SourceIcon({
  sourceType,
  gitUrl,
  imageRef,
  buildType,
  className,
}: {
  sourceType: SourceType
  gitUrl?: string | null
  imageRef?: string | null
  buildType?: BuildType
  className?: string
}) {
  if (sourceType === "image")
    return <ImageRegistryIcon imageRef={imageRef} className={className} />
  if (gitUrl) return <GitProviderIcon url={gitUrl} className={className} />
  return <Glyph icon={buildType ? BUILD_ICON[buildType] : GitBranch} className={className} />
}

/** Icon of a compose stack source (git repository or built-in template). */
export function ComposeSourceIcon({
  source,
  gitUrl,
  className,
}: {
  source: "git" | "template"
  gitUrl?: string | null
  className?: string
}) {
  return source === "template" ? (
    <Glyph icon={Layers} className={className} />
  ) : (
    <GitProviderIcon url={gitUrl} className={className} />
  )
}
