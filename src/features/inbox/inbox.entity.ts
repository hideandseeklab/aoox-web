/** Mirrors InboxItemDto / InboxPageDto in aoox-api (inbox module). */
export interface InboxItem {
  id: string
  event: string
  level: "success" | "failure" | "info"
  title: string
  summary: string
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
