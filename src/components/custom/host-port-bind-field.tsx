"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { normalizeBind, type HostPortBind } from "@/lib/host-port-bind"

/**
 * "Public / This server only (127.0.0.1)" choice that goes with every host
 * port. Docker publishes on every interface by default and ufw does not filter
 * those ports, so "this server only" is the safe choice for databases and
 * admin tools. Uncontrolled (`defaultValue` + `name`, posts with the form) or
 * controlled (`value` + `onValueChange`).
 */
export function HostPortBindField({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  disableLoopback,
  hideHelp,
  label,
  className,
}: {
  id: string
  name?: string
  defaultValue?: HostPortBind
  value?: HostPortBind
  onValueChange?: (v: HostPortBind) => void
  /** Swarm services cannot bind a host IP: only "public" is offered. */
  disableLoopback?: boolean
  hideHelp?: boolean
  label?: string
  className?: string
}) {
  const t = useTranslations("common.hostPortBind")
  const [inner, setInner] = useState<HostPortBind>(normalizeBind(defaultValue))
  const current = value ?? inner

  return (
    <div className={cn("space-y-1", className)}>
      <FieldLabel htmlFor={id}>{label ?? t("label")}</FieldLabel>
      <Select
        name={name}
        value={current}
        onValueChange={(next) => {
          setInner(normalizeBind(next))
          onValueChange?.(normalizeBind(next))
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="public">{t("public")}</SelectItem>
          <SelectItem value="loopback" disabled={disableLoopback}>
            {t("loopback")}
          </SelectItem>
        </SelectContent>
      </Select>
      {!hideHelp && (
        <FieldDescription>
          {disableLoopback
            ? t("serviceModeNote")
            : current === "loopback"
              ? t("loopbackHelp")
              : t("publicHelp")}
        </FieldDescription>
      )}
    </div>
  )
}
