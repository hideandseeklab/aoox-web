"use client"

import { RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState, useTransition } from "react"
import { LogViewer } from "@/components/custom/log-viewer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { containerLogsAction } from "@/features/docker/docker.actions"
import type {
  DockerContainer,
  DockerContainerLogs,
} from "@/features/docker/docker.entity"

const TAILS = ["100", "200", "500"]

/** One-shot log tail of a container (not a live stream); reload to fetch again. */
export function DockerLogsDialog(props: {
  container: DockerContainer | null
  serverId: string | null
  onClose: () => void
}) {
  return <LogsDialog key={props.container?.id ?? "none"} {...props} />
}

function LogsDialog({
  container,
  serverId,
  onClose,
}: {
  container: DockerContainer | null
  serverId: string | null
  onClose: () => void
}) {
  const [tail, setTail] = useState("200")
  const [data, setData] = useState<DockerContainerLogs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const id = container?.id
  const load = useCallback(() => {
    if (!id) return
    start(async () => {
      setError(null)
      const r = await containerLogsAction(id, Number(tail), serverId)
      if (r.ok) setData(r.data)
      else setError(r.error)
    })
  }, [id, tail, serverId])

  // The dialog body is keyed by container id (see below), so `data` starts empty for each one.
  useEffect(() => {
    if (id) load()
  }, [id, load])

  return (
    <Dialog open={!!container} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Log {container?.name}</DialogTitle>
          <DialogDescription>
            Baris terakhir sekali ambil, bukan stream. Maksimal 500 baris.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Select value={tail} onValueChange={setTail}>
            <SelectTrigger className="w-32" aria-label="Jumlah baris">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAILS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t} baris
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={load}
          >
            <RefreshCw data-icon="inline-start" />
            Muat ulang
          </Button>
          {data?.truncated && (
            <span className="text-muted-foreground">Bagian lama dipotong.</span>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <LogViewer
            text={data?.logs ?? ""}
            label="Log container"
            empty={pending && !data ? "Memuat…" : "(tidak ada keluaran log)"}
            className="h-[50vh]"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
