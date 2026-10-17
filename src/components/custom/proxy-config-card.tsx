"use client"

import {
  ExternalLink,
  FileCode2,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  ProxyConfigEditor,
  type EditorTarget,
} from "@/components/custom/proxy-config-editor"
import { ProxyConfigPresetDialog } from "@/components/custom/proxy-config-preset-dialog"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { ProxyConfigIllustration } from "@/components/custom/illustrations/proxy-config-illustration"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  deleteProxyConfigAction,
  proxyConfigStateAction,
  syncProxyConfigAction,
  updateProxyConfigAction,
} from "@/features/proxy-config/proxy-config.actions"
import type {
  ProxyConfigFile,
  ProxyPreset,
} from "@/features/proxy-config/proxy-config.entity"
import { useRouter } from "@/lib/use-router"

const DOCS = {
  en: "https://aoox.dev/docs/proxy-configuration",
  id: "https://aoox.dev/id/docs/konfigurasi-proxy",
}

/**
 * Operator-written Traefik dynamic configuration for one proxy (the aoox host or a remote
 * server). Each file is stored in aoox and written to the proxy as `user-<name>.yml`; Traefik
 * reloads it live. Only the owner can change anything; admins can read. The proxy is chosen
 * once at the top of the page (`?server=`).
 */
export function ProxyConfigCard({
  files,
  presets,
  serverId,
  isOwner,
}: {
  files: ProxyConfigFile[]
  presets: ProxyPreset[]
  serverId: string | null
  isOwner: boolean
}) {
  const t = useTranslations("infra.proxyConfigCard")
  const locale = useLocale()
  const router = useRouter()
  const [target, setTarget] = useState<EditorTarget | null>(null)
  const [pending, start] = useTransition()
  const [ask, setAsk] = useState<{
    resolve: (accepted: boolean | null) => void
  } | null>(null)

  // A proxy from an older aoox is recreated once when the first file is written: ask first.
  const consent = async (willWrite: boolean): Promise<boolean | null> => {
    if (!willWrite) return false
    const s = await proxyConfigStateAction(serverId)
    if (!s.ok || !s.data.needsRecreate) return false
    return new Promise((resolve) => setAsk({ resolve }))
  }

  const toggle = (f: ProxyConfigFile, enabled: boolean) =>
    start(async () => {
      const accept = await consent(enabled)
      if (accept === null) return
      const r = await updateProxyConfigAction(f.id, {
        enabled,
        acceptProxyRestart: accept,
      })
      if (!r.ok) return void toast.error(r.error)
      if (r.data.sync.warning) toast.warning(r.data.sync.warning)
      router.refresh()
    })

  const resync = () =>
    start(async () => {
      const accept = await consent(files.some((f) => f.enabled))
      if (accept === null) return
      const r = await syncProxyConfigAction(serverId, accept)
      if (!r.ok) return void toast.error(r.error)
      if (r.data.notice) toast.info(r.data.notice)
      toast.success(r.data.warning ?? t("resynced", { count: r.data.files }))
    })

  const remote = serverId !== null
  const close = () => {
    setTarget(null)
    router.refresh()
  }

  const openPreset = (size: "sm" | "default") => (
    <ProxyConfigPresetDialog
      presets={presets}
      size={size}
      onResult={(name, content) => setTarget({ mode: "new", name, content })}
    />
  )
  const empty = files.length === 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-64 space-y-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}{" "}
              <a
                href={locale === "id" ? DOCS.id : DOCS.en}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
              >
                {t("learnMore")}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </CardDescription>
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              {!empty && openPreset("sm")}
              {!empty && (
                <Button size="sm" onClick={() => setTarget({ mode: "new" })}>
                  <Plus data-icon="inline-start" />
                  {t("newFile")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={resync}
                title={t("resyncHint")}
              >
                <RefreshCw data-icon="inline-start" />
                {t("resync")}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <Alert>
          <Info />
          <AlertDescription>
            {remote ? `${t("warning")} ${t("remoteNote")}` : t("warning")}
          </AlertDescription>
        </Alert>
        {empty ? (
          <IllustratedEmptyState
            bordered={false}
            className="py-2 sm:py-4"
            illustration={<ProxyConfigIllustration />}
            title={t("emptyTitle")}
            description={isOwner ? t("emptyOwner") : t("empty")}
            actions={
              isOwner ? (
                <>
                  {openPreset("default")}
                  <Button onClick={() => setTarget({ mode: "new" })}>
                    <Plus data-icon="inline-start" />
                    {t("newFile")}
                  </Button>
                </>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y rounded-md border">
            {files.map((f) => (
              <li key={f.id} className="space-y-1 px-3 py-2">
                <div className="flex items-center gap-3">
                  <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">{f.name}</span>
                  <code className="min-w-0 truncate text-muted-foreground">
                    {f.fileName}
                  </code>
                  {f.usedByDomains > 0 && (
                    <Badge variant="outline">
                      {t("usedBy", { count: f.usedByDomains })}
                    </Badge>
                  )}
                  <span className="ms-auto" />
                  <Switch
                    checked={f.enabled}
                    disabled={!isOwner || pending}
                    onCheckedChange={(v) => toggle(f, v)}
                    aria-label={t("enableFile", { name: f.name })}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t(isOwner ? "editFile" : "viewFile", {
                      name: f.name,
                    })}
                    onClick={() => setTarget({ mode: "edit", file: f })}
                  >
                    <Pencil />
                  </Button>
                  {isOwner && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("deleteFile", { name: f.name })}
                        >
                          <Trash2 />
                        </Button>
                      }
                      title={t("deleteTitle", { fileName: f.fileName })}
                      description={
                        f.usedByDomains > 0
                          ? t("deleteInUse", { count: f.usedByDomains })
                          : t("deleteDescription")
                      }
                      confirmLabel={t("delete")}
                      onConfirm={async () => {
                        const r = await deleteProxyConfigAction(f.id)
                        if (r.ok) router.refresh()
                        return r
                      }}
                    />
                  )}
                </div>
                <p className="truncate text-muted-foreground">
                  {[
                    f.middlewares.length > 0 &&
                      t("summaryMiddleware", {
                        list: f.middlewares.map((m) => `${m}@file`).join(", "),
                      }),
                    f.routers.length > 0 &&
                      t("summaryRouter", { list: f.routers.join(", ") }),
                    f.services.length > 0 &&
                      t("summaryService", { list: f.services.join(", ") }),
                    !f.enabled && t("disabled"),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ProxyConfigEditor
        target={target}
        serverId={serverId}
        canWrite={isOwner}
        consent={consent}
        onClose={close}
      />
      <ConfirmDialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open && ask) {
            ask.resolve(null)
            setAsk(null)
          }
        }}
        tone="neutral"
        title={t("recreateTitle")}
        description={t("recreateDescription")}
        confirmLabel={t("recreateConfirm")}
        onConfirm={async () => {
          ask?.resolve(true)
          setAsk(null)
        }}
      />
    </Card>
  )
}
