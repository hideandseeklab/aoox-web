"use client"

import { Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"

/** Icon button that copies `text` and says so in a toast; `label` names what was copied. */
export function CopyButton({ label, text }: { label: string; text: string }) {
  const t = useTranslations("common.copyButton")
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("label", { label })}
      onClick={() =>
        void copyToClipboard(text).then((ok) =>
          ok
            ? toast.success(t("copied", { label }))
            : toast.error(t("failed", { label: label.toLowerCase() }))
        )
      }
    >
      <Copy />
    </Button>
  )
}
