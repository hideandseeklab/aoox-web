"use client"

import { CopyButton } from "@/components/custom/copy-button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * The Docker container name other containers on the `aoox` network use to reach this resource,
 * with a compact copy button. `hint` (optional) shows in a tooltip; the copy button copies the name.
 */
export function ContainerName({
  name,
  label,
  hint,
}: {
  name: string
  /** Names what is copied ("Container name"). */
  label: string
  hint?: string | null
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5">
      {hint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="cursor-help font-mono break-all underline decoration-dotted underline-offset-2"
            >
              {name}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-balance">
            {hint}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="font-mono break-all">{name}</span>
      )}
      <CopyButton
        label={label}
        text={name}
        className="-my-1 size-5 shrink-0 [&_svg]:size-3"
      />
    </span>
  )
}
