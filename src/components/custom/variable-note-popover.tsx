"use client"

import { StickyNote } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { type PointerEvent, useRef, useState } from "react"

/**
 * Small note icon for a variable in a masked list. The note opens on hover
 * (pointer devices), on click or tap, and from the keyboard (Enter/Space on
 * the focused icon); Escape or a click outside closes it. A popover rather
 * than a tooltip because tooltips never open on touch.
 */
export function VariableNotePopover({
  note,
  label,
}: {
  note: string
  /** Accessible name of the icon button, e.g. "Note for API_URL". */
  label: string
}) {
  const [open, setOpen] = useState(false)
  // Opened by hovering: closes again when the pointer leaves. A click pins it.
  const hover = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (hover.current) setOpen(false)
    }, 120)
  }
  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    cancelClose()
    if (!open) {
      hover.current = true
      setOpen(true)
    }
  }
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") scheduleClose()
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        hover.current = false
        setOpen(next)
      }}
    >
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={label}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={(e) => {
          // A click while hover-opened pins the note instead of closing it.
          if (open && hover.current) {
            e.preventDefault()
            hover.current = false
          }
        }}
        className="-my-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:text-foreground [&_svg]:size-3.5"
      >
        <StickyNote aria-hidden />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-h-72 w-max max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-popover px-3 py-2 text-xs break-words whitespace-pre-wrap text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          {note}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
