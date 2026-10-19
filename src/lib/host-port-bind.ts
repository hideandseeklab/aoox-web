/** Which interface a published host port listens on (mirrors aoox-api `HostPortBind`). */
export const HOST_PORT_BINDS = ["public", "loopback"] as const
export type HostPortBind = (typeof HOST_PORT_BINDS)[number]

/** Unknown or missing values are the historical behaviour: public. */
export function normalizeBind(value: unknown): HostPortBind {
  return value === "loopback" ? "loopback" : "public"
}
