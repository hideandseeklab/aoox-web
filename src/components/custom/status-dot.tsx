import { cn } from "@/lib/utils"

export type StatusTone = "active" | "transition" | "error" | "idle"

const ACTIVE = new Set(["running", "active", "healthy", "success", "up"])
const TRANSITION = new Set([
  "building",
  "deploying",
  "creating",
  "starting",
  "queued",
  "pushing",
  "restarting",
  "stopping",
  "pending",
])
const ERROR = new Set(["error", "failed", "unhealthy", "down", "dead"])

/** The one meaning of status colour everywhere: lime = running, amber = in transition, red = failed, muted = anything else (stopped, exited…). */
export function statusTone(status: string): StatusTone {
  const s = status.toLowerCase()
  if (ACTIVE.has(s)) return "active"
  if (TRANSITION.has(s)) return "transition"
  if (ERROR.has(s)) return "error"
  return "idle"
}

const DOT: Record<StatusTone, string> = {
  active: "bg-primary",
  transition: "bg-amber-500 motion-safe:animate-pulse",
  error: "bg-destructive",
  idle: "bg-muted-foreground/40",
}

/**
 * Small round status marker. The raw status stays in the `title` and for
 * screen readers (sr-only); with `label` the text is shown next to the dot.
 */
export function StatusDot({
  status,
  label,
  showLabel = false,
  tone,
  className,
}: {
  status: string
  /** Replaces the status as the displayed/announced text (e.g. "berjalan…"). */
  label?: string
  showLabel?: boolean
  tone?: StatusTone
  className?: string
}) {
  const text = label ?? status
  const dot = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        DOT[tone ?? statusTone(status)],
        !showLabel && className
      )}
    />
  )
  if (!showLabel) {
    return (
      <span title={text} className="inline-flex">
        {dot}
        <span className="sr-only">{text}</span>
      </span>
    )
  }
  return (
    <span
      title={status}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      {dot}
      {text}
    </span>
  )
}
