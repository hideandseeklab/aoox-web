"use client"

import { ChevronDown, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AuditLog } from "@/features/audit-log/audit-log.entity"

const VIA_LABEL: Record<string, string> = {
  session: "sesi",
  token: "API token",
  webhook: "webhook",
  anonymous: "anonim",
}

function statusVariant(s: number) {
  if (s >= 500) return "destructive" as const
  if (s >= 400) return "outline" as const
  return "default" as const
}

/** Newest first; `before` cursor from the last row for the next page. */
export function AuditLogTable({
  rows,
  action,
}: {
  rows: AuditLog[]
  action: string
}) {
  const router = useRouter()
  const [q, setQ] = useState(action)
  const [open, setOpen] = useState<string | null>(null)
  const last = rows[rows.length - 1]

  return (
    <div className="space-y-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.push(
            `/settings/audit-log${q.trim() ? `?action=${encodeURIComponent(q.trim())}` : ""}`
          )
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter aksi, mis. deploy, /databases/, sign-in"
          className="max-w-md font-mono text-xs"
          aria-label="Filter aksi"
        />
        <Button type="submit" variant="outline" size="sm">
          <Search data-icon="inline-start" />
          Cari
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada entri.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {rows.map((r) => {
            const expanded = open === r.id
            return (
              <li key={r.id} className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={expanded ? "Tutup detail" : "Buka detail"}
                    onClick={() => setOpen(expanded ? null : r.id)}
                  >
                    {expanded ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">
                      {r.action}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.actorEmail ?? "—"} · {VIA_LABEL[r.via] ?? r.via}
                      {r.ip && ` · ${r.ip.replace(/^::ffff:/, "")}`}
                    </span>
                  </span>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                {expanded && (
                  <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(
                      { path: r.path, params: r.params, body: r.body },
                      null,
                      2
                    )}
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {last && rows.length >= 100 && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/settings/audit-log?before=${encodeURIComponent(last.createdAt)}${action ? `&action=${encodeURIComponent(action)}` : ""}`}
            >
              Lebih lama →
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
