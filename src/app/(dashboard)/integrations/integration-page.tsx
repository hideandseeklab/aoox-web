import { useTranslations } from "next-intl"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"

/** Heading + breadcrumb shared by the Integrations pages (one card each). */
export function IntegrationPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const t = useTranslations("integrations.page")
  return (
    <>
      <SetBreadcrumb
        items={[
          { label: t("breadcrumb"), href: "/integrations" },
          { label: title },
        ]}
      />
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </>
  )
}
