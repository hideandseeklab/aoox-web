"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { ActionAlert } from "@/components/custom/action-alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchResourceStorageAction } from "@/features/resource-storage/resource-storage.actions"
import type {
  ResourceStorage,
  StorageItem,
  StorageTarget,
} from "@/features/resource-storage/resource-storage.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"
import { formatRelative } from "@/i18n/format"

/**
 * Disk use of one application, database or compose stack, measured by the API
 * on demand (one cached `docker system df`) when the card mounts; not polled.
 */
export function ResourceStorageCard({
  target,
  id,
}: {
  target: StorageTarget
  id: string
}) {
  const t = useTranslations("common.storage")
  const td = useTranslations("common.daemonUnreachable")
  const locale = useLocale()
  const [data, setData] = useState<ResourceStorage | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    void fetchResourceStorageAction(target, id).then((r) => {
      if (cancelled) return
      setData(r)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [target, id])

  const refresh = () =>
    start(async () => {
      const r = await fetchResourceStorageAction(target, id)
      if (r) setData(r)
      setLoaded(true)
    })

  const label = (item: StorageItem) =>
    item.kind === "backups"
      ? t("backupFiles", { count: item.count ?? 0 })
      : item.name

  const sub = (item: StorageItem) =>
    item.kind === "container" && item.role === "companion"
      ? t("kind.companion")
      : t(`kind.${item.kind}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !loaded}
            onClick={refresh}
          >
            <RefreshCw className={pending ? "animate-spin" : undefined} />
            {t("refresh")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {!loaded ? (
          // Roughly the height of a loaded card, so the page does not jump.
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{t("failed")}</p>
        ) : data.unreachable ? (
          <ActionAlert
            variant="warning"
            icon={<TriangleAlert />}
            title={td("title")}
            description={t("unreachable")}
          >
            <p className="font-mono text-xs break-words opacity-80">
              {td("reason", { reason: data.unreachable })}
            </p>
          </ActionAlert>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground">{t("total")}</p>
              <p className="text-3xl font-semibold tracking-tighter tabular-nums">
                {data.totalBytes === null ? "–" : formatBytes(data.totalBytes)}
              </p>
            </div>
            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.items.map((item) => (
                  <li
                    key={`${item.kind}:${item.name}`}
                    className={`flex items-start justify-between gap-3 px-3 py-2 ${
                      item.kind === "image" ? "text-muted-foreground" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm break-all ${
                          item.kind === "backups" ? "" : "font-mono"
                        }`}
                      >
                        {label(item)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub(item)}
                        {item.kind === "image" && ` · ${t("imageNote")}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">
                      {item.bytes === null ? "–" : formatBytes(item.bytes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.measuredAt && (
              <p className="text-xs text-muted-foreground">
                {t("measured", {
                  when: formatRelative(data.measuredAt, locale),
                })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
