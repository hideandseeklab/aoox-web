import type { AlertOwnerKind } from "./resource-alert.entity"

export const alertsPath = (kind: AlertOwnerKind, id: string) =>
  `/${kind === "application" ? "applications" : "databases"}/${id}/alerts`
