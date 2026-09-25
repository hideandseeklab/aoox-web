"use client"

import { CircleCheck, CircleX, History, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  clearQueryHistoryAction,
  fetchQueryHistoryAction,
} from "@/features/managed-database/data-browser.actions"
import type { QueryHistoryEntry } from "@/features/managed-database/data-browser.entity"

function fmt(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * A member's own recent statements/commands against this database — not a
 * shared log, each viewer sees only what they ran. Picking one fills the
 * query box; it still has to be run again.
 */
export function QueryHistoryMenu({
  databaseId,
  onPick,
}: {
  databaseId: string
  onPick: (sql: string) => void
}) {
  const [entries, setEntries] = useState<QueryHistoryEntry[] | null>(null)
  const [pending, start] = useTransition()

  const load = () =>
    start(async () => {
      const r = await fetchQueryHistoryAction(databaseId)
      if (r.ok) setEntries(r.data)
    })

  const clear = () =>
    start(async () => {
      const r = await clearQueryHistoryAction(databaseId)
      if (r.ok) setEntries([])
    })

  return (
    <DropdownMenu onOpenChange={(o) => o && entries === null && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <History data-icon="inline-start" />
          Riwayat
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 w-96 overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          Query terakhir
          {entries && entries.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Bersihkan riwayat"
              disabled={pending}
              onClick={(e) => {
                e.stopPropagation()
                clear()
              }}
            >
              <Trash2 />
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {entries === null || pending ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Memuat…</p>
        ) : entries.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Belum ada riwayat.
          </p>
        ) : (
          entries.map((e) => (
            <DropdownMenuItem
              key={e.id}
              className="flex flex-col items-start gap-1 whitespace-normal"
              onClick={() => onPick(e.sql)}
            >
              <div className="flex w-full items-center gap-1.5">
                {e.success ? (
                  <CircleCheck className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <CircleX className="size-3 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {e.sql}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ps-[18px] text-xs text-muted-foreground">
                {fmt(e.createdAt)}
                {e.db && <Badge variant="outline">{e.db}</Badge>}
                {!e.success && e.errorMessage && (
                  <span className="truncate text-destructive">
                    {e.errorMessage}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
