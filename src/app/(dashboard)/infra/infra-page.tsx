import { useTranslations } from "next-intl"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { PageHeader } from "@/components/custom/page-header"

/** Heading + breadcrumb shared by the Infrastructure pages (one component each). */
export function InfraPage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  /** Page-wide controls on the right of the heading (wrap under it on a phone). */
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useTranslations("infra.page")
  return (
    <>
      <SetBreadcrumb
        items={[{ label: t("breadcrumb"), href: "/infra" }, { label: title }]}
      />
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </>
  )
}
