"use client"

import { useSyncExternalStore } from "react"

/** Whole seconds since epoch; the interval is the "external store" the clock subscribes to. */
function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000)
  return () => clearInterval(t)
}
const getSeconds = () => Math.floor(Date.now() / 1000)
// Server snapshot: the server cannot know the browser's clock/timezone, so
// render nothing there and fill in after hydration (no mismatch).
const getServerSeconds = () => null

/**
 * Day, date and a ticking clock (with seconds) in the viewer's locale and
 * timezone.
 */
export function LiveClock() {
  const seconds = useSyncExternalStore(subscribe, getSeconds, getServerSeconds)
  if (seconds === null) return <div className="h-10" aria-hidden />
  const now = new Date(seconds * 1000)

  return (
    <div className="text-end tabular-nums" aria-live="off">
      <p className="text-sm font-medium">
        {now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p className="font-mono text-2xl leading-tight font-semibold">
        <time dateTime={now.toISOString()}>
          {now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </time>
      </p>
    </div>
  )
}
