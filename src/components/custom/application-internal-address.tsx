import { useTranslations } from "next-intl"
import { CopyButton } from "@/components/custom/copy-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { InternalAddress } from "@/features/application/application.entity"

/**
 * The name other applications of the project reach this one by, without a
 * domain or a host port, and the env reference that resolves to it. Not a
 * secret: shown to every project member.
 */
export function ApplicationInternalAddress({
  address,
}: {
  address: InternalAddress
}) {
  const t = useTranslations("applications")
  const rows = [
    { label: t("internalAddress.address"), value: address.url },
    { label: t("internalAddress.reference"), value: address.reference },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("internalAddress.title")}</CardTitle>
        <CardDescription className="max-w-3xl">
          {t(`internalAddress.scope.${address.scope}`)}{" "}
          {t("internalAddress.notBrowser")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-xs">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <code className="min-w-0 rounded bg-muted px-1.5 py-0.5 text-xs break-all">
                  {row.value}
                </code>
                <CopyButton label={row.label} text={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
