/** Flat facts the API stores with an event (`variant` names its meaning); never secrets or raw logs. */
export type InboxParams = Record<string, string | number | boolean | null>

/** Mirrors InboxItemDto / InboxPageDto in aoox-api (inbox module). */
export interface InboxItem {
  id: string
  event: string
  level: "success" | "failure" | "info"
  title: string
  summary: string
  /** Structured facts for localized rendering; null on events recorded before they existed. */
  params: InboxParams | null
  /** Path inside the web app, or null. */
  link: string | null
  projectId: string | null
  createdAt: string
}

export interface InboxPage {
  items: InboxItem[]
  /** Visible events newer than the user's read marker. */
  unread: number
}
