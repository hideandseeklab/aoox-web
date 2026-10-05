"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"

/** Icon button that copies `text` and says so in a toast; `label` names what was copied. */
export function CopyButton({ label, text }: { label: string; text: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Salin ${label}`}
      onClick={() =>
        void copyToClipboard(text).then((ok) =>
          ok
            ? toast.success(`${label} disalin`)
            : toast.error(`Gagal menyalin ${label.toLowerCase()}`)
        )
      }
    >
      <Copy />
    </Button>
  )
}
