"use client"

import {
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Search,
  WrapText,
} from "lucide-react"
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseAnsi, type AnsiSpan } from "@/lib/ansi"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

/** Lines drawn at once; older ones stay behind a button, so a log of tens of thousands of lines stays light. */
const WINDOW = 2000
/** Only the tail of a huge log is parsed. */
const MAX_CHARS = 2_000_000
/** Closer than this to the bottom counts as "at the bottom" (px). */
const BOTTOM_SLACK = 24

interface Match {
  line: number
  start: number
  end: number
}

function findMatches(plains: string[], query: string): Match[] {
  const q = query.toLowerCase()
  if (!q) return []
  const found: Match[] = []
  for (let line = 0; line < plains.length; line++) {
    const hay = plains[line].toLowerCase()
    for (
      let at = hay.indexOf(q);
      at !== -1;
      at = hay.indexOf(q, at + q.length)
    ) {
      found.push({ line, start: at, end: at + q.length })
      if (found.length >= 5000) return found
    }
  }
  return found
}

function spanStyle(s: AnsiSpan): React.CSSProperties | undefined {
  if (!s.fg && !s.bold && !s.dim && !s.italic && !s.underline) return undefined
  return {
    color: s.fg,
    fontWeight: s.bold ? 600 : undefined,
    opacity: s.dim ? 0.65 : undefined,
    fontStyle: s.italic ? "italic" : undefined,
    textDecoration: s.underline ? "underline" : undefined,
  }
}

/** One line: styled spans, with the search hits (`ranges` are offsets into the plain line) marked. */
function LineText({
  spans,
  ranges,
  active,
}: {
  spans: AnsiSpan[]
  ranges: Match[]
  /** The range that is the current hit, if it is on this line. */
  active: Match | null
}) {
  if (spans.length === 0) return <>{"​"}</>
  const starts: number[] = []
  let total = 0
  for (const s of spans) {
    starts.push(total)
    total += s.text.length
  }
  return (
    <>
      {spans.map((s, i) => {
        const from = starts[i]
        const offset = from + s.text.length
        const style = spanStyle(s)
        const hits = ranges.filter((r) => r.end > from && r.start < offset)
        if (hits.length === 0)
          return (
            <span key={i} style={style}>
              {s.text}
            </span>
          )
        const parts: React.ReactNode[] = []
        let cursor = from
        for (const h of hits) {
          const a = Math.max(h.start, from)
          const b = Math.min(h.end, offset)
          if (a > cursor)
            parts.push(
              <Fragment key={`t${cursor}`}>
                {s.text.slice(cursor - from, a - from)}
              </Fragment>
            )
          parts.push(
            <mark
              key={`m${a}`}
              className={cn(
                "rounded-[2px] text-inherit",
                h === active
                  ? "bg-primary text-primary-foreground"
                  : "bg-amber-400/35"
              )}
            >
              {s.text.slice(a - from, b - from)}
            </mark>
          )
          cursor = b
        }
        if (cursor < offset)
          parts.push(
            <Fragment key={`t${cursor}`}>{s.text.slice(cursor - from)}</Fragment>
          )
        return (
          <span key={i} style={style}>
            {parts}
          </span>
        )
      })}
    </>
  )
}

const ghost =
  "text-neutral-300 hover:bg-white/10 hover:text-neutral-50 aria-pressed:bg-white/15 aria-pressed:text-neutral-50"

/**
 * The one log pane (deployment, container, compose, job and Docker logs):
 * ANSI colours (escape sequences are parsed, never injected as HTML), line
 * numbers, search with next/previous, follow-the-tail that lets go as soon as
 * you scroll up, wrap toggle and copy. Only the last {WINDOW} lines are drawn
 * until you ask for older ones.
 */
export function LogViewer({
  text,
  empty = "Menunggu output…",
  className = "h-80",
  initialFollow = true,
  lineNumbers = true,
  label = "Log",
}: {
  text: string
  /** Shown while there is no text. */
  empty?: string
  /** Height of the scroll area (`h-80`, `max-h-64`…). */
  className?: string
  initialFollow?: boolean
  lineNumbers?: boolean
  label?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(initialFollow)
  const [wrap, setWrap] = useState(true)
  const [limit, setLimit] = useState(WINDOW)
  const [query, setQuery] = useState("")
  const deferred = useDeferredValue(query)
  const [current, setCurrent] = useState(0)

  const lines = useMemo(
    () =>
      parseAnsi(text.length > MAX_CHARS ? text.slice(-MAX_CHARS) : text),
    [text]
  )
  const hasText = text.length > 0
  const matches = useMemo(
    () =>
      findMatches(
        lines.map((l) => l.plain),
        deferred
      ),
    [lines, deferred]
  )
  const active = matches.length > 0 ? matches[current % matches.length] : null
  // The drawn window reaches back far enough to include the current hit.
  const activeLine = active?.line
  const start = Math.max(
    0,
    Math.min(
      lines.length - limit,
      activeLine === undefined ? Infinity : activeLine - 50
    )
  )

  // Follow the tail while it is on.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && follow) el.scrollTop = el.scrollHeight
  }, [text, follow, wrap, limit])

  // Bring the current hit into view.
  useEffect(() => {
    if (activeLine === undefined) return
    const el = scrollRef.current
    const row = el?.querySelector<HTMLElement>(`[data-line="${activeLine}"]`)
    if (el && row)
      el.scrollTop = row.offsetTop - el.clientHeight / 2 + row.clientHeight / 2
  }, [activeLine, current, deferred])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK
    setFollow((f) => (f === atBottom ? f : atBottom))
  }

  function step(delta: number) {
    if (matches.length === 0) return
    setFollow(false)
    setCurrent((c) => (c + delta + matches.length) % matches.length)
  }

  async function copyAll() {
    const ok = await copyToClipboard(lines.map((l) => l.plain).join("\n"))
    if (ok) toast.success("Log disalin")
    else toast.error("Gagal menyalin log")
  }

  const rangesByLine = useMemo(() => {
    const map = new Map<number, Match[]>()
    for (const m of matches) {
      const list = map.get(m.line)
      if (list) list.push(m)
      else map.set(m.line, [m])
    }
    return map
  }, [matches])

  const rows: React.ReactNode[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    rows.push(
      <div
        key={i}
        data-line={i}
        className={cn("flex", !wrap && "w-max min-w-full")}
      >
        {lineNumbers && (
          <span
            aria-hidden="true"
            className="sticky left-0 w-12 shrink-0 bg-[#0a0a0a] pe-3 text-end text-neutral-600 tabular-nums select-none"
          >
            {i + 1}
          </span>
        )}
        <span
          className={cn(
            "min-w-0 flex-1",
            wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre"
          )}
        >
          <LineText
            spans={line.spans}
            ranges={rangesByLine.get(i) ?? []}
            active={active && active.line === i ? active : null}
          />
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border bg-[#0a0a0a] text-neutral-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 p-1.5">
        <div className="relative min-w-32 flex-1 sm:max-w-56">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500"
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCurrent(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                step(e.shiftKey ? -1 : 1)
              }
            }}
            placeholder="Cari di log…"
            aria-label={`Cari di ${label.toLowerCase()}`}
            className="border-white/15 bg-white/5 ps-7 text-neutral-100 placeholder:text-neutral-500 dark:bg-white/5"
          />
        </div>
        {query && (
          <span className="px-1 text-[11px] text-neutral-400 tabular-nums">
            {matches.length === 0
              ? "0 hasil"
              : `${(current % matches.length) + 1}/${matches.length}`}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={ghost}
          aria-label="Hasil sebelumnya"
          disabled={matches.length === 0}
          onClick={() => step(-1)}
        >
          <ChevronUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={ghost}
          aria-label="Hasil berikutnya"
          disabled={matches.length === 0}
          onClick={() => step(1)}
        >
          <ChevronDown />
        </Button>
        <span className="ms-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            className={ghost}
            aria-pressed={follow}
            title="Gulir otomatis ke baris terbaru"
            onClick={() => setFollow((f) => !f)}
          >
            <ArrowDownToLine data-icon="inline-start" />
            Ikuti
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={ghost}
            aria-pressed={wrap}
            aria-label="Bungkus baris panjang"
            title="Bungkus baris panjang"
            onClick={() => setWrap((w) => !w)}
          >
            <WrapText />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={ghost}
            aria-label={`Salin semua ${label.toLowerCase()}`}
            title="Salin semua"
            disabled={!hasText}
            onClick={() => void copyAll()}
          >
            <Copy />
          </Button>
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="off"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "relative overflow-auto p-3 font-mono text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
          className
        )}
      >
        {!hasText ? (
          <p className="text-neutral-500">{empty}</p>
        ) : (
          <>
            {start > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={cn(ghost, "mb-1")}
                onClick={() => {
                  setFollow(false)
                  setLimit((l) => l + WINDOW)
                }}
              >
                {start.toLocaleString("id-ID")} baris sebelumnya disembunyikan —
                tampilkan lebih banyak
              </Button>
            )}
            {rows}
          </>
        )}
      </div>
    </div>
  )
}
