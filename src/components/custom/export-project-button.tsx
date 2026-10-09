"use client"

import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Downloads the project definition as JSON via the web proxy route (the
 * browser cannot send the Bearer header itself). Secrets = database
 * passwords; the API allows that only for owners, so the item is hidden
 * for everyone else.
 */
export function ExportProjectButton({
  id,
  canExportSecrets,
}: {
  id: string
  canExportSecrets: boolean
}) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const href = (secrets: boolean) =>
    `/api/projects/${id}/export${secrets ? "?includeSecrets=true" : ""}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download data-icon="inline-start" />
          {tc("actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("export.label")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={href(false)} download>
            <span className="flex flex-col">
              <span>{t("export.withoutSecrets")}</span>
              <span className="text-xs text-muted-foreground">
                {t("export.withoutSecretsHint")}
              </span>
            </span>
          </a>
        </DropdownMenuItem>
        {canExportSecrets && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={href(true)} download>
                <span className="flex flex-col">
                  <span>{t("export.withSecrets")}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("export.withSecretsHint")}
                  </span>
                </span>
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
