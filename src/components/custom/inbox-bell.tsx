"use client"

import { Bell, CircleAlert, CircleCheck, Info } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getInboxAction,
  markInboxReadAction,
} from "@/features/inbox/inbox.actions"
import type { InboxItem, InboxPage } from "@/features/inbox/inbox.entity"
import { describeInboxItem } from "@/features/inbox/inbox.describe"
import { badgeText } from "@/features/inbox/inbox.format"
import { formatRelative } from "@/i18n/format"

const POLL_MS = 30_000

const LEVEL_ICON = {
  success: { Icon: CircleCheck, cls: "text-primary" },
  failure: { Icon: CircleAlert, cls: "text-destructive" },
  info: { Icon: Info, cls: "text-muted-foreground" },
} as const

/**
 * The bell in the top bar: unread count from a light poll (every 30 s while the
 * tab is visible, and on each navigation), and the latest events in a menu.
 * What a user sees depends on their project access — the API decides that.
 */
export function InboxBell() {
  const t = useTranslations("inbox")
  const pathname = usePathname()
  const [page, setPage] = useState<InboxPage | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  // Bumped by the poll timer; fetching happens in the effect below.
  const [tick, setTick] = useState(0)

  // Fetch on mount, on every navigation, when the menu opens, and on each poll tick.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const r = await getInboxAction()
      if (!cancelled && r.ok) setPage(r.data)
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, open, tick])

  // Light poll, paused while the tab is hidden.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1)
    }, POLL_MS)
    return () => clearInterval(t)
  }, [])

  const unread = page?.unread ?? 0
  const markRead = () =>
    start(async () => {
      const r = await markInboxReadAction()
      if (r.ok) setPage((p) => (p ? { ...p, unread: 0 } : p))
    })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread > 0 ? t("labelUnread", { count: unread }) : t("title")
          }
        >
          <Bell />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-medium text-primary-foreground tabular-nums"
            >
              {badgeText(unread)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 max-w-[calc(100vw-1.5rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-medium">{t("title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || unread === 0}
            onClick={markRead}
          >
            {t("markAllRead")}
          </Button>
        </div>
        {page === null ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {t("loading")}
          </p>
        ) : page.items.length === 0 ? (
          <div className="p-3">
            <EmptyState icon={Bell} compact>
              {t("empty")}
            </EmptyState>
          </div>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {page.items.map((item, index) => (
              <InboxRow
                key={item.id}
                item={item}
                unread={index < unread}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function InboxRow({
  item,
  unread,
  onNavigate,
}: {
  item: InboxItem
  unread: boolean
  onNavigate: () => void
}) {
  const t = useTranslations("inbox")
  const locale = useLocale()
  const { Icon, cls } = LEVEL_ICON[item.level]
  // Composed in the active language; events without params (or unknown ones) keep the API's English text.
  const localized = describeInboxItem(item, { t, locale })
  const title = localized?.title ?? item.title
  const summary = localized ? localized.summary : item.summary
  const body = (
    <>
      <Icon aria-hidden="true" className={`mt-0.5 size-3.5 shrink-0 ${cls}`} />
      <span className="min-w-0 flex-1 text-xs">
        <span className="flex items-start justify-between gap-2">
          <span className={unread ? "font-medium" : ""}>{title}</span>
          {unread && (
            <span
              className="mt-1 size-1.5 shrink-0 rounded-full bg-primary"
              title={t("unread")}
            />
          )}
        </span>
        {summary && (
          <span className="mt-0.5 line-clamp-2 block text-muted-foreground">
            {summary}
          </span>
        )}
        <span className="mt-0.5 block text-muted-foreground tabular-nums">
          {formatRelative(item.createdAt, locale)}
        </span>
      </span>
    </>
  )
  return (
    <li>
      {item.link ? (
        <Link
          href={item.link}
          onClick={onNavigate}
          className="flex gap-2 px-3 py-2 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        <div className="flex gap-2 px-3 py-2">{body}</div>
      )}
    </li>
  )
}
