import { Fragment } from "react"

/**
 * Renders a technical identifier (image reference, container name) so that a narrow box wraps it
 * only after the given separator characters, never in the middle of a token such as `0.1.0` or
 * `haf1qd`. Pair it with `break-words`: the browser then breaks at a `<wbr>` first and only splits
 * a token when that single token is wider than the box.
 */
export function BreakRef({
  text,
  separators = "/:@",
}: {
  text: string
  /** Characters after which a line break is allowed. */
  separators?: string
}) {
  const escaped = separators.replace(/[\\]^-]/g, "\$&")
  const parts = text.split(new RegExp(`([${escaped}])`))
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i % 2 === 1 && <wbr />}
        </Fragment>
      ))}
    </>
  )
}
