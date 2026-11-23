"use client"

import { useState, type ComponentProps } from "react"
import { Tabs } from "@/components/ui/tabs"
import { confirmDiscard } from "@/lib/unsaved-changes"

/**
 * `Tabs` for a server page whose tab content holds an editor: an inactive tab
 * panel is unmounted, so switching away from unsaved changes asks first
 * (`confirmDiscard`, same dialog as leaving the page). Uncontrolled like
 * `<Tabs defaultValue>`; client components with their own tab state wrap
 * their `onValueChange` in `confirmDiscard` instead.
 */
export function GuardedTabs({
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Tabs>, "value" | "onValueChange"> & {
  defaultValue: string
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <Tabs
      {...props}
      value={value}
      onValueChange={(next) => confirmDiscard(() => setValue(next))}
    />
  )
}
