"use client"

import {
  Boxes,
  FolderKanban,
  Layers,
  Monitor,
  Moon,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { EngineIcon } from "@/components/custom/brand-icon"
import { EmptyState } from "@/components/custom/empty-state"
import { AUDIT_LOG_NAV, visibleNav } from "@/components/custom/nav-items"
import { StatusDot } from "@/components/custom/status-dot"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchProjectsAction } from "@/features/project/project.actions"
import type { ProjectListItem } from "@/features/project/project.entity"
import { useRouter } from "@/lib/use-router"
import { cn } from "@/lib/utils"

type Group = "Halaman" | "Project & resource" | "Tampilan"
const GROUPS: Group[] = ["Halaman", "Project & resource", "Tampilan"]

interface Item {
  id: string
  group: Group
  label: string
  /** Secondary text (the project an instance belongs to, the kind of page). */
  hint?: string
  icon: React.ReactNode
  /** Shown after the label. */
  trailing?: React.ReactNode
  /** What is searched besides the label. */
  keywords?: string
  href?: string
  run?: () => void
}

/** Resources shown while nothing is typed. */
const IDLE_RESOURCES = 8
const MAX_RESOURCES = 20

/** Substring beats subsequence; earlier and tighter beats later and looser. Null = no match. */
function score(query: string, text: string): number | null {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const at = t.indexOf(q)
  if (at !== -1) return 1000 - at - (t.length - q.length) * 0.01
  let ti = 0
  let first = -1
  let last = -1
  for (const ch of q) {
    ti = t.indexOf(ch, ti)
    if (ti === -1) return null
    if (first === -1) first = ti
    last = ti
    ti++
  }
  return 500 - (last - first)
}

/** The shortcut must not steal Ctrl+K from places that edit text or run a shell. */
function inEditor(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "TEXTAREA" ||
    target.closest(".xterm") !== null ||
    target.closest("[data-no-palette]") !== null
  )
}

const ICON = "size-3.5 shrink-0 text-muted-foreground"

function instanceHref(kind: string, id: string) {
  if (kind === "database") return `/databases/${id}`
  if (kind === "compose") return `/compose/${id}`
  return `/applications/${id}`
}

function resourceItems(projects: ProjectListItem[]): Item[] {
  const out: Item[] = []
  for (const p of projects) {
    out.push({
      id: `p:${p.id}`,
      group: "Project & resource",
      label: p.name,
      hint: "project",
      icon: <FolderKanban className={ICON} />,
      href: `/projects/${p.id}`,
    })
    for (const i of p.instances) {
      out.push({
        id: `${i.kind}:${i.id}`,
        group: "Project & resource",
        label: i.name,
        hint: p.name,
        keywords: `${i.kind === "compose" ? "stack compose" : i.kind} ${i.engine ?? ""}`,
        icon:
          i.kind === "database" && i.engine ? (
            <EngineIcon engine={i.engine} className="text-muted-foreground" />
          ) : i.kind === "compose" ? (
            <Layers className={ICON} />
          ) : (
            <Boxes className={ICON} />
          ),
        trailing: (
          <StatusDot status={i.deploying ? "deploying" : i.status} showLabel />
        ),
        href: instanceHref(i.kind, i.id),
      })
    }
  }
  return out
}

/**
 * Ctrl/Cmd+K quick jump: pages (the same list and gates as the sidebar), your
 * projects and their applications/databases/stacks (one `GET /projects`, read the
 * first time it opens) and theme switches. It never writes anything.
 */
export function CommandPalette({
  showTerminal,
  isOwner,
}: {
  showTerminal: boolean
  isOwner: boolean
}) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null)
  const loading = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const isMac = useSyncExternalStore(
    () => () => undefined,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false
  )

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (next) {
      // Whatever had focus gets it back on close (the dialog has no Radix trigger to return to).
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      setQuery("")
      setActive(0)
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return
      if (e.key.toLowerCase() !== "k") return
      if (!open && inEditor(e.target)) return
      e.preventDefault()
      if (open) setOpen(false)
      else onOpenChange(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  // Read the projects once, the first time the palette opens.
  useEffect(() => {
    if (!open || projects !== null || loading.current) return
    loading.current = true
    void fetchProjectsAction().then(setProjects)
  }, [open, projects])

  const items = useMemo(() => {
    const nav = visibleNav({ showTerminal, isOwner })
    const pages: Item[] = [
      ...nav.platform.map((n) => ({
        id: `nav:${n.href}`,
        group: "Halaman" as const,
        label: n.title,
        hint: n.href.startsWith("/infra/") ? "infrastruktur" : undefined,
        icon: <n.icon className={ICON} />,
        href: n.href,
      })),
      ...nav.infra.map((n) => ({
        id: `nav:${n.href}`,
        group: "Halaman" as const,
        label: n.title,
        hint: "infrastruktur",
        icon: <n.icon className={ICON} />,
        href: n.href,
      })),
      ...nav.settings.map((n) => ({
        id: `settings:${n.tab}`,
        group: "Halaman" as const,
        label: n.title,
        hint: "settings",
        icon: <n.icon className={ICON} />,
        href: `/settings?tab=${n.tab}`,
      })),
      ...(nav.auditLog
        ? [
            {
              id: `nav:${AUDIT_LOG_NAV.href}`,
              group: "Halaman" as const,
              label: AUDIT_LOG_NAV.title,
              hint: "settings",
              icon: <AUDIT_LOG_NAV.icon className={ICON} />,
              href: AUDIT_LOG_NAV.href,
            },
          ]
        : []),
    ]
    const theme = (id: string, label: string, Icon: LucideIcon, value: string) => ({
      id: `theme:${id}`,
      group: "Tampilan" as const,
      label,
      keywords: "tema theme warna mode",
      icon: <Icon className={ICON} />,
      run: () => setTheme(value),
    })
    const actions: Item[] = [
      theme("light", "Tema terang", Sun, "light"),
      theme("dark", "Tema gelap", Moon, "dark"),
      theme("system", "Tema sistem", Monitor, "system"),
    ]
    return { pages, actions, resources: resourceItems(projects ?? []) }
  }, [showTerminal, isOwner, projects, setTheme])

  const results = useMemo(() => {
    const q = query.trim()
    const rank = (list: Item[], limit: number) => {
      if (!q) return list.slice(0, limit)
      return list
        .map((it) => ({
          it,
          s: score(q, `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`),
        }))
        .filter((r): r is { it: Item; s: number } => r.s !== null)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map((r) => r.it)
    }
    return [
      ...rank(items.pages, 50),
      ...rank(items.resources, q ? MAX_RESOURCES : IDLE_RESOURCES),
      ...rank(items.actions, 5),
    ]
  }, [items, query])

  const current = results.length > 0 ? Math.min(active, results.length - 1) : -1

  const choose = useCallback(
    (item: Item) => {
      setOpen(false)
      if (item.run) item.run()
      else if (item.href) router.push(item.href)
    },
    [router]
  )

  useEffect(() => {
    if (!open || current < 0) return
    listRef.current
      ?.querySelector<HTMLElement>(`#cmdk-opt-${current}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [open, current])

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (results.length === 0) return
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((current + step + results.length) % results.length)
    } else if (e.key === "Home" && results.length > 0) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === "End" && results.length > 0) {
      e.preventDefault()
      setActive(results.length - 1)
    } else if (e.key === "Enter" && current >= 0) {
      e.preventDefault()
      choose(results[current])
    }
  }

  const shortcut = isMac ? "⌘K" : "Ctrl K"

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-muted-foreground"
        aria-label="Cari (Ctrl K)"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => onOpenChange(true)}
      >
        <Search data-icon="inline-start" />
        <span className="hidden sm:inline">Cari…</span>
        <kbd className="hidden rounded border px-1 font-mono text-[10px] leading-4 sm:inline">
          {shortcut}
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            returnFocus.current?.focus()
          }}
          className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Cari</DialogTitle>
          <DialogDescription className="sr-only">
            Lompat ke halaman, project atau resource, atau ganti tema.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={
                current >= 0 ? `cmdk-opt-${current}` : undefined
              }
              aria-autocomplete="list"
              aria-label="Cari halaman, project atau resource"
              placeholder="Cari halaman, project, aplikasi…"
              className="h-7 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div
            ref={listRef}
            id="cmdk-list"
            role="listbox"
            aria-label="Hasil"
            className="max-h-[50vh] overflow-y-auto p-1"
          >
            {results.length === 0 ? (
              <EmptyState icon={Search} compact className="border-0">
                {projects === null && query ? "Memuat…" : "Tidak ada hasil."}
              </EmptyState>
            ) : (
              GROUPS.map((group) => {
                const rows = results.filter((r) => r.group === group)
                if (rows.length === 0) return null
                return (
                  <div
                    key={group}
                    role="group"
                    aria-labelledby={`cmdk-g-${group}`}
                  >
                    <div
                      id={`cmdk-g-${group}`}
                      className="px-2 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {group}
                    </div>
                    {rows.map((item) => {
                      const i = results.indexOf(item)
                      return (
                        <div
                          key={item.id}
                          id={`cmdk-opt-${i}`}
                          role="option"
                          aria-selected={i === current}
                          onMouseMove={() => i !== active && setActive(i)}
                          onClick={() => choose(item)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                            i === current && "bg-muted"
                          )}
                        >
                          {item.icon}
                          <span className="min-w-0 truncate">{item.label}</span>
                          {item.hint && (
                            <span className="min-w-0 truncate text-muted-foreground">
                              {item.hint}
                            </span>
                          )}
                          {item.trailing && (
                            <span className="ms-auto shrink-0">
                              {item.trailing}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
            {projects === null && results.length > 0 && (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                Memuat project…
              </p>
            )}
          </div>
          <div className="hidden items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground sm:flex">
            <span>↑↓ pilih</span>
            <span>Enter buka</span>
            <span>Esc tutup</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
