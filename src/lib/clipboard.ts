/**
 * `navigator.clipboard` only exists in secure contexts (HTTPS or localhost) —
 * on a panel opened over plain HTTP by IP (the default before a domain is
 * set), it's `undefined` and calling `.writeText` throws synchronously.
 * Falls back to the legacy `execCommand("copy")` path via a hidden textarea.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to the legacy path below
    }
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
