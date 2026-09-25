"use client"

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

const STATIC: Record<string, string> = {
  "": "Dashboard",
  projects: "Projects",
  templates: "Templates",
  registry: "Registry",
  terminal: "Terminal",
  settings: "Settings",
  "audit-log": "Audit log",
  infra: "Infrastruktur",
  applications: "Aplikasi",
  databases: "Database",
  compose: "Stack compose",
}

/**
 * Navbar breadcrumb. Detail pages (and the Settings tabs) publish their own
 * crumbs via `SetBreadcrumb`; everything else is derived from the path. No
 * `useSearchParams` here: under the navbar's Suspense boundary it left the
 * crumb subtree un-hydrated on a full page load until the first interaction.
 */
export function AppBreadcrumb() {
  const published = useBreadcrumb()
  const pathname = usePathname()

  let crumbs: Crumb[]
  if (published) {
    crumbs = published
  } else {
    const segments = pathname.split("/").filter(Boolean)
    crumbs = segments.map((seg, i) => ({
      label: STATIC[seg] ?? seg,
      href:
        i < segments.length - 1
          ? `/${segments.slice(0, i + 1).join("/")}`
          : undefined,
    }))
  }
  // Dashboard is always the root; on "/" it is the only crumb.
  const items: Crumb[] =
    pathname === "/"
      ? [{ label: "Dashboard" }]
      : [{ label: "Dashboard", href: "/" }, ...crumbs]

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
