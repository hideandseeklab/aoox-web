"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ArrowUpToLine,
  GripVertical,
} from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * One sortable row of the env editor (dnd-kit `useSortable`). Only the handle
 * starts a drag, so the fields inside keep working as before; the row moves
 * with a translate only (rows have different heights: notes, comments).
 *
 * The handle is built here and handed to `children` to place: mouse and
 * touch drag (`touch-action: none` so the page does not scroll instead), and
 * Space/Enter + arrow keys through dnd-kit's keyboard sensor. It has the
 * height of the fields next to it. `disabled` (read-only editors) renders no
 * handle.
 */
export function SortableEnvRow({
  id,
  disabled,
  label,
  className,
  handleClassName,
  children,
}: {
  id: string
  disabled: boolean
  /** Name of the row for the handle's label. */
  label: string
  className?: string
  handleClassName?: string
  children: (handle: ReactNode) => ReactNode
}) {
  const t = useTranslations("common.envEditor")
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    attributes: { roleDescription: t("dragRoleDescription") },
  })
  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t("dragAria", { name: label })}
      title={t("dragTitle")}
      className={cn(
        "flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing",
        handleClassName
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        className,
        isDragging &&
          "relative z-10 rounded-md bg-background shadow-md ring-1 ring-border"
      )}
    >
      {children(handle)}
    </div>
  )
}

/**
 * The same moves without dragging (phones, and anyone who prefers a menu):
 * up, down, to the top, to the bottom.
 */
export function EnvRowMoveMenu({
  label,
  index,
  total,
  onMove,
}: {
  label: string
  index: number
  total: number
  onMove: (to: number) => void
}) {
  const t = useTranslations("common.envEditor")
  const first = index === 0
  const last = index === total - 1
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("moveMenuAria", { name: label })}
          title={t("moveMenu")}
          disabled={total < 2}
          className="text-muted-foreground"
        >
          <ArrowUpDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto whitespace-nowrap">
        <DropdownMenuItem disabled={first} onSelect={() => onMove(index - 1)}>
          <ArrowUp />
          {t("moveUp")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={last} onSelect={() => onMove(index + 1)}>
          <ArrowDown />
          {t("moveDown")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={first} onSelect={() => onMove(0)}>
          <ArrowUpToLine />
          {t("moveTop")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={last} onSelect={() => onMove(total - 1)}>
          <ArrowDownToLine />
          {t("moveBottom")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
