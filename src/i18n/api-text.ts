/**
 * Text that the API defines (template names and descriptions, proxy preset labels) is translated
 * through a dictionary keyed by the API's stable id. The dictionary entry wins when the active
 * locale has one; otherwise the API text is shown, so an item added to the API later still
 * displays (in English) before a translation exists.
 */
export interface ApiTextTranslator {
  (key: string): string
  has(key: string): boolean
}

export function apiText(t: ApiTextTranslator, key: string, fallback: string): string {
  return t.has(key) ? t(key) : fallback
}
