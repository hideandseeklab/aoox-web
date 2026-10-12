"use client"

import { BellRing, Loader2 } from "lucide-react"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  CPU_THRESHOLD_OPTIONS,
  DURATION_OPTIONS,
  MEMORY_THRESHOLD_OPTIONS,
  type AlertMetric,
  type AlertOwnerKind,
  type AlertRule,
  type AlertRuleConfig,
  type ResourceAlertsView,
} from "@/features/resource-alert/resource-alert.entity"
import { saveResourceAlertsAction } from "@/features/resource-alert/resource-alert.actions"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const METRICS: AlertMetric[] = ["cpu", "memory"]

/** Locale/timezone differ between server and browser: format dates only after mount. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
}

type Form = Record<AlertMetric, AlertRuleConfig>

const toForm = (v: ResourceAlertsView): Form => ({
  cpu: {
    enabled: v.cpu.enabled,
    thresholdPercent: v.cpu.thresholdPercent,
    durationMinutes: v.cpu.durationMinutes,
  },
  memory: {
    enabled: v.memory.enabled,
    thresholdPercent: v.memory.thresholdPercent,
    durationMinutes: v.memory.durationMinutes,
  },
})

/** The option list plus the saved value when it is not one of the presets (an imported rule). */
const withCurrent = (options: readonly number[], current: number) =>
  options.includes(current)
    ? options
    : [...options, current].sort((a, b) => a - b)

/**
 * CPU / memory alert rules of an application or a database: a rule per metric
 * with a switch, a threshold and a duration. Developers and up edit; viewers
 * only read (the API enforces it too).
 */
export function ResourceAlertsCard({
  kind,
  id,
  initial,
  canEdit,
}: {
  kind: AlertOwnerKind
  id: string
  initial: ResourceAlertsView
  canEdit: boolean
}) {
  const t = useTranslations("alerts")
  const tc = useTranslations("common")
  const locale = useLocale()
  const mounted = useMounted()
  const uid = useId()
  const [view, setView] = useState(initial)
  const [form, setForm] = useState<Form>(toForm(initial))
  const [busy, setBusy] = useState<"save" | "toggle" | null>(null)
  const toastId = useRef<string | number | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(view)) && canEdit

  async function run(
    kindOfWork: "save" | "toggle",
    input: Partial<Record<AlertMetric, Partial<AlertRuleConfig>>>,
    messages: { loading: string; success: string }
  ) {
    setBusy(kindOfWork)
    toastId.current = toast.loading(messages.loading)
    const r = await saveResourceAlertsAction(kind, id, input)
    if (r.ok) {
      setView(r.data)
      setForm(toForm(r.data))
      toast.success(messages.success, { id: toastId.current })
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  const update = (metric: AlertMetric, patch: Partial<AlertRuleConfig>) =>
    setForm((f) => ({ ...f, [metric]: { ...f[metric], ...patch } }))

  const hint = (metric: AlertMetric): string => {
    if (metric === "cpu")
      return view.limits.cpuMillicores
        ? t("hint.cpuLimit", { cores: view.limits.cpuMillicores / 1000 })
        : t("hint.cpu")
    return view.limits.memoryMb
      ? t("hint.memoryLimit", { limit: view.limits.memoryMb })
      : t("hint.memory")
  }

  const reading = (rule: AlertRule): string => {
    if (rule.state.status === "alerting" && rule.state.since && mounted)
      return t("reading.since", {
        when: formatDateTime(rule.state.since, locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })
    if (rule.state.lastValue === null) return t("reading.none")
    return t("reading.last", {
      value: Math.round(rule.state.lastValue * 10) / 10,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <BellRing className="size-4" aria-hidden="true" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-xs">
        {METRICS.map((metric, index) => {
          const rule = view[metric]
          const f = form[metric]
          const options =
            metric === "cpu" ? CPU_THRESHOLD_OPTIONS : MEMORY_THRESHOLD_OPTIONS
          const status = rule.enabled ? rule.state.status : null
          return (
            <section
              key={metric}
              aria-labelledby={`${uid}-${metric}`}
              className={`space-y-3 ${index > 0 ? "border-t pt-5" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Switch
                    id={`${uid}-${metric}-enabled`}
                    aria-labelledby={`${uid}-${metric}`}
                    checked={f.enabled}
                    disabled={!canEdit || busy !== null}
                    onCheckedChange={(v) =>
                      void run(
                        "toggle",
                        { [metric]: { ...f, enabled: v } },
                        {
                          loading: v
                            ? t("toast.enabling")
                            : t("toast.disabling"),
                          success: v ? t("toast.enabled") : t("toast.disabled"),
                        }
                      )
                    }
                  />
                  <Label
                    id={`${uid}-${metric}`}
                    htmlFor={`${uid}-${metric}-enabled`}
                    className="text-sm font-medium"
                  >
                    {t(`metrics.${metric}`)}
                  </Label>
                  <Badge
                    variant={
                      status === null
                        ? "outline"
                        : status === "alerting"
                          ? "destructive"
                          : status === "pending"
                            ? "secondary"
                            : "default"
                    }
                  >
                    {t(`state.${status ?? "disabled"}`)}
                  </Badge>
                </div>
                {rule.enabled && (
                  <span className="text-xs text-muted-foreground">
                    {reading(rule)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor={`${uid}-${metric}-threshold`}>
                    {t("fields.threshold")}
                  </Label>
                  <Select
                    value={String(f.thresholdPercent)}
                    disabled={!canEdit}
                    onValueChange={(v) =>
                      update(metric, { thresholdPercent: Number(v) })
                    }
                  >
                    <SelectTrigger
                      id={`${uid}-${metric}-threshold`}
                      className="w-full"
                    >
                      <SelectValue>
                        {t("fields.percent", { n: f.thresholdPercent })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {withCurrent(options, f.thresholdPercent).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {t("fields.percent", { n })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${uid}-${metric}-duration`}>
                    {t("fields.duration")}
                  </Label>
                  <Select
                    value={String(f.durationMinutes)}
                    disabled={!canEdit}
                    onValueChange={(v) =>
                      update(metric, { durationMinutes: Number(v) })
                    }
                  >
                    <SelectTrigger
                      id={`${uid}-${metric}-duration`}
                      className="w-full"
                    >
                      <SelectValue>
                        {t("fields.minutes", { n: f.durationMinutes })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {withCurrent(DURATION_OPTIONS, f.durationMinutes).map(
                        (n) => (
                          <SelectItem key={n} value={String(n)}>
                            {t("fields.minutes", { n })}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{hint(metric)}</p>
            </section>
          )
        })}

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() =>
                void run("save", form, {
                  loading: t("toast.saving"),
                  success: t("toast.saved"),
                })
              }
              disabled={!dirty || busy !== null}
            >
              {busy === "save" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {tc("actions.save")}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("note")}</p>
      </CardContent>
    </Card>
  )
}
