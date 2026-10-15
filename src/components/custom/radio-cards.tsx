"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A radio group drawn as buttons (cards or chips) with native radio keyboard
 * behaviour: one tab stop (roving tabindex on the checked item), arrow keys
 * and Home/End move focus *and* select, Space/Enter select. The value is not
 * submitted by this component: render a hidden input next to it.
 */
export function RadioCards<T extends string>({
  value,
  onValueChange,
  options,
  labelledBy,
  describedBy,
  className,
  itemClassName,
  renderItem,
}: {
  value: T
  onValueChange: (value: T) => void
  options: readonly T[]
  /** Id of the visible label element of the group. */
  labelledBy: string
  /** Id of an element that describes the current choice. */
  describedBy?: string
  className?: string
  /** Classes for one item; `checked` decides the selected look. */
  itemClassName?: (checked: boolean) => string
  renderItem: (option: T, checked: boolean) => ReactNode
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const selected = options.indexOf(value)

  function move(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = options.length - 1
    let next: number
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
      default:
        return
    }
    e.preventDefault()
    onValueChange(options[next])
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={className}
    >
      {options.map((option, i) => {
        const checked = option === value
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selected === -1 && i === 0) ? 0 : -1}
            onClick={() => onValueChange(option)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              itemClassName?.(checked)
            )}
          >
            {renderItem(option, checked)}
          </button>
        )
      })}
    </div>
  )
}
