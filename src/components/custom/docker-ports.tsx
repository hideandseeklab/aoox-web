"use client"

import { Globe, Lock, ShieldAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { LinkArrow } from "@/components/custom/arrows"
import {
  DockerEmpty,
  matches,
  useDockerQuery,
} from "@/components/custom/docker-ui"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OpenPort } from "@/features/docker/docker.entity"

/** The "reachable from" badge, shared by the table and the phone cards. */
function ExposureBadge({ p }: { p: OpenPort }) {
  const t = useTranslations("docker")
  return p.exposure === "loopback" ? (
    <Badge variant="secondary" title={p.addresses.join(", ")}>
      <Lock data-icon="inline-start" />
      {t("ports.exposure.loopback")}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-amber-500/40 text-amber-700 dark:text-amber-400"
      title={p.addresses.join(", ")}
    >
      <Globe data-icon="inline-start" />
      {p.exposure === "public"
        ? t("ports.exposure.public")
        : t("ports.exposure.address", { address: p.addresses.join(", ") })}
    </Badge>
  )
}

/** The "managed by" badge (or the muted "not managed" text). */
function OwnerBadge({ p }: { p: OpenPort }) {
  const t = useTranslations("docker")
  return p.managed ? (
    <Badge variant="outline">{t(`managed.kinds.${p.managed.kind}`)}</Badge>
  ) : (
    <span className="text-muted-foreground">{t("ports.notManaged")}</span>
  )
}

function resourceHref(p: OpenPort): string | null {
  const l = p.managed?.link
  if (!l) return null
  if (l.type === "application") return `/applications/${l.id}`
  if (l.type === "database") return `/databases/${l.id}`
  return `/compose/${l.id}`
}

/**
 * Every port the containers of the chosen server publish, who owns it and who
 * can reach it. Read only: change the address from the resource's own page
 * (application, database, admin app, stack).
 */
export function DockerPorts({ ports }: { ports: OpenPort[] }) {
  const t = useTranslations("docker")
  const query = useDockerQuery()
  const open = ports.filter((p) => p.openToInternet).length
  const rows = ports.filter((p) =>
    matches(
      query,
      String(p.port),
      p.containerName,
      p.image,
      p.managed ? t(`managed.kinds.${p.managed.kind}`) : undefined
    )
  )

  return (
    <div className="space-y-3">
      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <ShieldAlert />
        <AlertTitle>{t("ports.infoTitle")}</AlertTitle>
        <AlertDescription className="space-y-1 text-amber-700/90 dark:text-amber-400/90">
          <p>{t("ports.info")}</p>
          <p>{t("ports.infoFix")}</p>
        </AlertDescription>
      </Alert>
      {ports.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("ports.summary", { open, closed: ports.length - open })}
        </p>
      )}
      {rows.length === 0 ? (
        <DockerEmpty icon={Globe}>
          {ports.length === 0 ? t("ports.empty") : t("ports.noMatch")}
        </DockerEmpty>
      ) : (
        <>
          {/* Phone: one card per port, so nothing scrolls sideways. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((p) => {
              const href = resourceHref(p)
              return (
                <li
                  key={`${p.containerId}-${p.port}-${p.protocol}-${p.containerPort}`}
                  className="space-y-2 rounded-lg border p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono">
                      <span className="text-sm font-medium">
                        {p.port}/{p.protocol}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        → {p.containerPort}
                      </span>
                    </div>
                    <div className="min-w-0 shrink-0">
                      <ExposureBadge p={p} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-mono" title={p.containerName}>
                      {p.containerName}
                    </div>
                    <div
                      className="truncate font-mono text-muted-foreground"
                      title={p.image}
                    >
                      {p.image}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <OwnerBadge p={p} />
                    {href && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={href}>
                          {t("containers.openPage")}
                          <LinkArrow />
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="hidden rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ports.port")}</TableHead>
                  <TableHead>{t("ports.reachableFrom")}</TableHead>
                  <TableHead>{t("ports.container")}</TableHead>
                  <TableHead>{t("managedBy")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const href = resourceHref(p)
                  return (
                    <TableRow
                      key={`${p.containerId}-${p.port}-${p.protocol}-${p.containerPort}`}
                    >
                      <TableCell className="font-mono whitespace-nowrap">
                        <div>
                          {p.port}/{p.protocol}
                        </div>
                        <div className="text-muted-foreground">
                          → {p.containerPort}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <ExposureBadge p={p} />
                      </TableCell>
                      <TableCell className="max-w-64">
                        <div
                          className="truncate font-mono"
                          title={p.containerName}
                        >
                          {p.containerName}
                        </div>
                        <div
                          className="truncate font-mono text-muted-foreground"
                          title={p.image}
                        >
                          {p.image}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <OwnerBadge p={p} />
                      </TableCell>
                      <TableCell className="text-end">
                        {href && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={href}>
                              {t("containers.openPage")}
                              <LinkArrow />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("ports.note")}</p>
    </div>
  )
}
