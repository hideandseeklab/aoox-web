"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
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
import { updateDatabaseResourcesAction } from "@/features/managed-database/managed-database.actions"
import type { ManagedDatabaseDetail } from "@/features/managed-database/managed-database.entity"

/** CPU/memory limits; raising/lowering applies live, removing restarts the container. */
export function DatabaseResources({ db }: { db: ManagedDatabaseDetail }) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const canEdit = db.projectRole !== "viewer"
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [cpu, setCpu] = useState(
    db.cpuMillicores ? String(db.cpuMillicores) : ""
  )
  const [memory, setMemory] = useState(db.memoryMb ? String(db.memoryMb) : "")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resources.title")}</CardTitle>
        <CardDescription>
          {t("resources.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await updateDatabaseResourcesAction(
                db.id,
                cpu.trim() ? Number(cpu) : null,
                memory.trim() ? Number(memory) : null
              )
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }}
        >
          <fieldset disabled={!canEdit} className="contents">
          <div className="space-y-1">
            <Label htmlFor="db-cpu">{t("resources.cpu")}</Label>
            <Input
              id="db-cpu"
              type="number"
              min={100}
              max={64000}
              step={100}
              placeholder={t("resources.cpuPlaceholder")}
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="db-mem">{t("resources.memory")}</Label>
            <Input
              id="db-mem"
              type="number"
              min={64}
              max={1048576}
              step={64}
              placeholder={t("resources.memoryPlaceholder")}
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="w-40"
            />
          </div>
          {canEdit && (
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? tc("states.saving") : tc("actions.save")}
          </Button>
          )}
          </fieldset>
          {error && (
            <p className="basis-full text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
