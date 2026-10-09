"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { type Crumb, useBreadcrumb } from "./breadcrumb-store"

/** Path segment -> key under `breadcrumb` in the message files. */
const STATIC: Record<string, string> = {
  projects: "projects",
  templates: "templates",
  registry: "registry",
  terminal: "terminal",
  settings: "settings",
  "audit-log": "auditLog",
  infra: "infrastructure",
  applications: "applications",
  databases: "databases",
  compose: "compose",
}

/**
 * Navbar breadcrumb. Detail pages (and the Settings tabs) publish their own
 * crumbs via `SetBreadcrumb`; everything else is derived from the path. No
 * `useSearchParams` here: under the navbar's Suspense boundary it left the
 * crumb subtree un-hydrated on a full page load until the first interaction.
 */
export function AppBreadcrumb() {
  const t = useTranslations("breadcrumb")
  const published = useBreadcrumb()
  const pathname = usePathname()

  let crumbs: Crumb[]
  if (published) {
    crumbs = published
  } else {
    const segments = pathname.split("/").filter(Boolean)
    crumbs = segments.map((seg, i) => ({
      label: STATIC[seg] ? t(STATIC[seg]) : seg,
      href:
        i < segments.length - 1
          ? `/${segments.slice(0, i + 1).join("/")}`
          : undefined,
    }))
  }
  // Dashboard is always the root; on "/" it is the only crumb.
  const items: Crumb[] =
    pathname === "/"
      ? [{ label: t("dashboard") }]
      : [{ label: t("dashboard"), href: "/" }, ...crumbs]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((c, i) => (
          <Fragment key={`${i}:${c.label}`}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {c.href ? (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
