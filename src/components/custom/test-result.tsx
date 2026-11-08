"use client"

import { CircleCheck, CircleX, Plug, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TestStatus = "success" | "warning" | "failure"

const STYLE = {
  success: {
    icon: CircleCheck,
    tone: "text-emerald-700 dark:text-emerald-400",
  },
  warning: { icon: TriangleAlert, tone: "text-amber-700 dark:text-amber-400" },
  failure: { icon: CircleX, tone: "text-destructive" },
} as const

/**
 * Outcome of a "Test" action on an integration (DNS, Infisical, S3, server,
 * notification channel, registry): an icon plus a one-line message, and an
 * optional muted detail line below it. Pass a translated sentence for success;
 * a failure may carry the API's own (English) message as is.
 */
export function TestResult({
  status,
  children,
  detail,
  className,
}: {
  status: TestStatus
  children: ReactNode
  detail?: ReactNode
  className?: string
}) {
  const { icon: Icon, tone } = STYLE[status]
  return (
    <div role="status" className={cn("space-y-0.5 text-xs", className)}>
      <p className={cn("flex items-start gap-1.5 font-medium", tone)}>
        <Icon className="mt-px size-3.5 shrink-0" />
        <span className="min-w-0 break-words">{children}</span>
      </p>
      {detail && (
        <p className="ps-5 break-words text-muted-foreground">{detail}</p>
      )}
    </div>
  )
}

/**
 * The labelled "Test" button that goes with {@link TestResult}: outline, plug
 * icon, and a "Testing…" label while `testing` is true. Set `testing` outside
 * the transition that runs the action, or the label never renders.
 */
export function TestButton({
  testing,
  disabled,
  onClick,
  ariaLabel,
}: {
  testing: boolean
  disabled: boolean
  onClick: () => void
  ariaLabel?: string
}) {
  const c = useTranslations("common")
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <Plug data-icon="inline-start" />
      {testing ? c("states.testing") : c("actions.test")}
    </Button>
  )
}
