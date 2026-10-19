"use client"

import { Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { copyOrSelect } from "@/lib/clipboard"
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
      onClick={(e) => {
        const button = e.currentTarget
        void copyOrSelect(text, button).then((result) => {
          if (result === "copied") toast.success(t("copied", { label }))
          // Not a success: the text is selected in place for Ctrl+C.
          else if (result === "selected")
            toast.warning(t("manual", { label: label.toLowerCase() }))
          else toast.error(t("failed", { label: label.toLowerCase() }))
        })
      }}
    >
      <Copy />
    </Button>
  )
}
