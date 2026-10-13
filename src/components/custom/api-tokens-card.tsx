"use client"

import { BookOpen, KeySquare, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { CreateApiTokenDialog } from "@/components/custom/create-api-token-dialog"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { deleteApiTokenAction } from "@/features/api-token/api-token.actions"
import type { ApiToken } from "@/features/api-token/api-token.entity"
import { formatDateTime } from "@/i18n/format"

function fmt(d: string | null, locale: string) {
  return d
    ? formatDateTime(d, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
}

/**
 * Personal access tokens for CI/CLI: the list (prefix only) with revoke, and
 * the "Create token" dialog in the header, which shows the plaintext once.
 */
export function ApiTokensCard({
  tokens,
  publicApiUrl,
  webOrigin,
  projects = [],
}: {
  tokens: ApiToken[]
  /** For the scope picker and the badges; empty hides the picker. */
  projects?: { id: string; name: string }[]
  publicApiUrl: string
  /** Fallback dashboard address for the CLI login command (`WEB_ORIGIN`). */
  webOrigin: string
}) {
  const t = useTranslations("settings")
  const locale = useLocale()
  // Read once per render (React Compiler forbids Date.now() inside the map).
  const [now] = useState(() => Date.now())

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tokens.title")}</CardTitle>
        <CardDescription>
          {t.rich("tokens.description", {
            code: (chunks) => <code>{chunks}</code>,
            docs: () => (
              <a
                href={`${publicApiUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all underline"
              >
                <BookOpen className="size-3 shrink-0" /> {publicApiUrl}/docs
              </a>
            ),
          })}
        </CardDescription>
        <CardAction>
          <CreateApiTokenDialog
            projects={projects}
            publicApiUrl={publicApiUrl}
            webOrigin={webOrigin}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <EmptyState icon={KeySquare} compact>
            {t("tokens.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border text-xs">
            {tokens.map((tok) => {
              const expired =
                tok.expiresAt && new Date(tok.expiresAt).getTime() < now
              return (
                <li key={tok.id} className="flex items-start gap-3 px-3 py-2.5">
                  <KeySquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="max-w-full truncate font-medium">
                        {tok.name}
                      </span>
                      {tok.readOnly && (
                        <Badge variant="outline">
                          {t("tokens.readOnlyBadge")}
                        </Badge>
                      )}
                      {tok.projectIds && (
                        <Badge
                          variant="outline"
                          title={tok.projectIds
                            .map(
                              (id) =>
                                projects.find((p) => p.id === id)?.name ?? id
                            )
                            .join(", ")}
                        >
                          {t("tokens.projectsBadge", {
                            count: tok.projectIds.length,
                          })}
                        </Badge>
                      )}
                      {tok.variableScopes && (
                        <Badge
                          variant="outline"
                          className="max-w-56 min-w-0"
                          title={tok.variableScopes.join(", ")}
                        >
                          <span className="truncate font-mono">
                            {t("tokens.variableScopesBadge", {
                              names: tok.variableScopes.join(", "),
                            })}
                          </span>
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive">
                          {t("tokens.expiredBadge")}
                        </Badge>
                      )}
                    </div>
                    <p className="flex flex-wrap gap-x-1.5 text-muted-foreground">
                      <span className="font-mono">{tok.prefix}…</span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        {t("tokens.lastUsed", {
                          used: fmt(tok.lastUsedAt, locale),
                        })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        {tok.expiresAt
                          ? t("tokens.expiresOn", {
                              date: fmt(tok.expiresAt, locale),
                            })
                          : t("tokens.noExpiry")}
                      </span>
                    </p>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-my-0.5"
                        aria-label={t("tokens.revoke")}
                        title={t("tokens.revoke")}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title={t("tokens.revokeTitle", { name: tok.name })}
                    description={t("tokens.revokeDescription")}
                    confirmLabel={t("tokens.revokeConfirm")}
                    onConfirm={() => deleteApiTokenAction(tok.id)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
