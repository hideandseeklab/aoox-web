import { useTranslations } from "next-intl"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"

/** Heading + breadcrumb shared by the Infrastruktur pages (one component each). */
export function InfraPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const t = useTranslations("infra.page")
  return (
    <>
      <SetBreadcrumb
        items={[{ label: t("breadcrumb"), href: "/infra" }, { label: title }]}
      />
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </>
  )
}
