"use client"

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
import type { ManagedDatabase } from "@/features/managed-database/managed-database.entity"

/** CPU/memory limits; raising/lowering applies live, removing restarts the container. */
export function DatabaseResources({ db }: { db: ManagedDatabase }) {
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
        <CardTitle>Batas sumber daya</CardTitle>
        <CardDescription>
          Kosong = tanpa batas. Menaikkan/menurunkan batas berlaku langsung;
          mencabut batas membuat container dibuat ulang (restart singkat, data
          aman di volume).
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
          <div className="space-y-1">
            <Label htmlFor="db-cpu">CPU (millicore)</Label>
            <Input
              id="db-cpu"
              type="number"
              min={100}
              max={64000}
              step={100}
              placeholder="1000 = 1 core"
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="db-mem">Memori (MiB)</Label>
            <Input
              id="db-mem"
              type="number"
              min={64}
              max={1048576}
              step={64}
              placeholder="mis. 512"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="w-40"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          {error && (
            <p className="basis-full text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
