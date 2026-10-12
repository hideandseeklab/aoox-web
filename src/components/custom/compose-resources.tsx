"use client"

import { Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateServiceResourcesAction } from "@/features/compose/compose.actions"
import type { ComposeServiceResources } from "@/features/compose/compose.entity"

/**
 * CPU/RAM caps, one row per service — compose has no single container to
 * limit, so unlike an application/database this is a list. Written into the
 * override's `deploy.resources.limits` on the next deploy (compose has no
 * live-update path like a plain container's `POST /containers/{id}/update`).
 */
export function ComposeResources({
  appId,
  resources,
  canEdit = true,
}: {
  appId: string
  resources: ComposeServiceResources[]
  /** False for project viewers: list only, no add/remove. */
  canEdit?: boolean
}) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const [service, setService] = useState("")
  const [cpu, setCpu] = useState("")
  const [memory, setMemory] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const save = (next: ComposeServiceResources[]) =>
    start(async () => {
      setError(null)
      const r = await updateServiceResourcesAction(appId, next)
      if (!r.ok) setError(r.error)
      else {
        setService("")
        setCpu("")
        setMemory("")
      }
    })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const svc = service.trim()
    if (!svc || (!cpu.trim() && !memory.trim())) return
    const without = resources.filter((r) => r.service !== svc)
    save([
      ...without,
      {
        service: svc,
        cpuMillicores: cpu.trim() ? Number(cpu) : null,
        memoryMb: memory.trim() ? Number(memory) : null,
      },
    ])
  }

  const remove = (svc: string) =>
    save(resources.filter((r) => r.service !== svc))

  if (!canEdit && resources.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resources.title")}</CardTitle>
        <CardDescription>
          {t("resources.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resources.length > 0 && (
          <ul className="divide-y rounded-md border text-xs">
            {resources.map((r) => (
              <li key={r.service} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono">
                  {r.service}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.cpuMillicores
                    ? t("resources.cpuLimit", { value: String(r.cpuMillicores) })
                    : t("resources.cpuUnlimited")}
                  {" · "}
                  {r.memoryMb
                    ? t("resources.memoryLimit", { value: String(r.memoryMb) })
                    : t("resources.ramUnlimited")}
                </span>
                {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("resources.removeAria", { service: r.service })}
                  disabled={pending}
                  onClick={() => remove(r.service)}
                >
                  <Trash2 />
                </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={add}>
          <div className="min-w-32 flex-1 space-y-1">
            <Label htmlFor="res-service">{t("access.service")}</Label>
            <Input
              id="res-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="web"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="res-cpu">{t("resources.cpuLabel")}</Label>
            <Input
              id="res-cpu"
              type="number"
              min={100}
              max={64_000}
              step={100}
              placeholder={t("resources.cpuPlaceholder")}
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="res-mem">{t("resources.memoryLabel")}</Label>
            <Input
              id="res-mem"
              type="number"
              min={64}
              max={1_000_000}
              step={64}
              placeholder={t("resources.memoryPlaceholder")}
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="w-40"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Plus data-icon="inline-start" />
            {pending ? tc("states.saving") : t("resources.submit")}
          </Button>
        </form>
        )}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
