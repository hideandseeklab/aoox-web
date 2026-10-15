"use client"

import { Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

/** Icon button that copies `text` and says so in a toast; `label` names what was copied. */
export function CopyButton({
  label,
  text,
  className,
}: {
  label: string
  text: string
  className?: string
}) {
  const t = useTranslations("common.copyButton")
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
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
