const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], dialog[open]'
const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open]'

/**
 * The legacy `execCommand("copy")` path for pages where `navigator.clipboard`
 * does not exist (a panel opened over plain HTTP by IP).
 *
 * The scratch textarea must live INSIDE the open dialog the click came from:
 * a Radix dialog traps focus, so a textarea appended to `document.body` is
 * outside the trap, focus is pulled back, the selection is lost and the copy
 * silently does nothing (seen in the "Token created" dialog). The result is
 * only trusted when the textarea really had the focus and the whole text
 * selected; focus goes back to where it was.
 */
function legacyCopy(text: string, anchor?: Element | null): boolean {
  if (typeof document === "undefined") return false
  const previous = document.activeElement as HTMLElement | null
  const from = anchor ?? previous
  const openDialogs = document.querySelectorAll(OPEN_DIALOG_SELECTOR)
  const host: Element =
    from?.closest?.(DIALOG_SELECTOR) ??
    openDialogs[openDialogs.length - 1] ??
    document.body
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.setAttribute("aria-hidden", "true")
  textarea.tabIndex = -1
  // 16px keeps iOS from zooming; fixed + transparent keeps it out of the layout.
  textarea.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;font-size:16px"
  host.appendChild(textarea)
  let ok = false
  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    ok =
      document.activeElement === textarea &&
      textarea.selectionEnd - textarea.selectionStart === text.length &&
      document.execCommand("copy")
  } catch {
    ok = false
  } finally {
    textarea.remove()
    try {
      previous?.focus?.({ preventScroll: true })
    } catch {
      // the previous element is gone; nothing to restore
    }
  }
  return ok
}

/**
 * `navigator.clipboard` only exists in secure contexts (HTTPS or localhost) —
 * on a panel opened over plain HTTP by IP (the default before a domain is
 * set), it's `undefined` and calling `.writeText` throws synchronously.
 * Falls back to the legacy `execCommand("copy")` path (see `legacyCopy`).
 * `anchor` is the clicked element (defaults to the focused one); it decides
 * which dialog the fallback textarea goes into.
 */
export async function copyToClipboard(
  text: string,
  anchor?: Element | null
): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to the legacy path below
    }
  }
  return legacyCopy(text, anchor)
}

/**
 * Copies text that is still being fetched (for example a value behind an
 * audited reveal). Safari only lets a page write to the clipboard during the
 * click itself, so the write starts right away with a `ClipboardItem` whose
 * content is the pending promise; browsers without that path copy once the
 * text has arrived. Resolves false when the text could not be fetched or
 * copied.
 */
export async function copyToClipboardLater(
  text: Promise<string>
): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })),
        }),
      ])
      return true
    } catch {
      // fall through to copying once the text is there
    }
  }
  try {
    return await copyToClipboard(await text)
  } catch {
    return false
  }
}

/** Selects the contents of `el` so Ctrl+C / Cmd+C copies it (the "copy manually" state). */
export function selectForManualCopy(el: Element | null | undefined): boolean {
  if (!el || typeof window === "undefined") return false
  try {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus({ preventScroll: true })
      el.select()
      return true
    }
    const selection = window.getSelection()
    if (!selection) return false
    const range = document.createRange()
    range.selectNodeContents(el)
    selection.removeAllRanges()
    selection.addRange(range)
    return true
  } catch {
    return false
  }
}

/**
 * The text element shown next to a copy button: the first `code`, `pre` or
 * read-only field in the button's row (looked up a few parents up).
 */
export function manualCopyTarget(button: Element | null | undefined): Element | null {
  let node = button?.parentElement ?? null
  for (let depth = 0; node && depth < 3; depth++, node = node.parentElement) {
    const target = node.querySelector(
      "code, pre, input[readonly], textarea[readonly]"
    )
    if (target) return target
  }
  return null
}

/**
 * Copies `text`; when that fails, selects the text shown next to `button` so
 * the user can press Ctrl+C. `selected` is not a success: callers must say so
 * ("copy manually") instead of showing a "copied" toast.
 */
export async function copyOrSelect(
  text: string,
  button: Element | null | undefined
): Promise<"copied" | "selected" | "failed"> {
  if (await copyToClipboard(text, button)) return "copied"
  return selectForManualCopy(manualCopyTarget(button)) ? "selected" : "failed"
}
