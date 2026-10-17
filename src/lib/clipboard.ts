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
