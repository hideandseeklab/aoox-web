"use client"

import { PathArrow } from "@/components/custom/arrows"
import { Trash2, UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberAction,
} from "@/features/project-member/project-member.actions"
import {
  type ProjectMembers,
  type ProjectRole,
} from "@/features/project-member/project-member.entity"

const ROLES: ProjectRole[] = ["admin", "developer", "viewer"]

/**
 * Who sees this project. Platform owners/admins and the creator are always
 * in (implicit); other members are added by e-mail (they must already have
 * an account — invite from Settings → Tim). Only project admins edit.
 */
export function ProjectMembers({
  projectId,
  data,
}: {
  projectId: string
  data: ProjectMembers
}) {
  const t = useTranslations("projects")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ProjectRole>("developer")
  const canEdit = data.myRole === "admin"

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("members.failed"))
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("members.title")}</CardTitle>
        <CardDescription>
          {t.rich("members.description", {
            arrow: () => <PathArrow />,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y rounded-md border text-xs">
          {data.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {m.name || m.email}
                  {m.name && (
                    <span className="ms-1 text-muted-foreground">
                      {m.email}
                    </span>
                  )}
                </p>
                {m.implicit && (
                  <p className="text-xs text-muted-foreground">
                    {m.platformRole === "member"
                      ? t("members.creator")
                      : t("members.platformRole", { role: m.platformRole })}
                  </p>
                )}
              </div>
              {canEdit && !m.implicit ? (
                <>
                  <Select
                    value={m.role}
                    onValueChange={(r) =>
                      run(() =>
                        updateProjectMemberAction(
                          projectId,
                          m.userId,
                          r as ProjectRole
                        )
                      )
                    }
                  >
                    <SelectTrigger className="w-32" aria-label={t("members.roleAria")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`members.roles.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("members.removeAria")}
                    disabled={pending}
                    onClick={() =>
                      run(() => removeProjectMemberAction(projectId, m.userId))
                    }
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : (
                <Badge variant="outline">{t(`members.roles.${m.role}`)}</Badge>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                const r = await addProjectMemberAction(projectId, email, role)
                if (r.ok) setEmail("")
                return r
              })
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("members.emailPlaceholder")}
              className="min-w-48 flex-1"
              aria-label={t("members.emailAria")}
            />
            <Select
              value={role}
              onValueChange={(r) => setRole(r as ProjectRole)}
            >
              <SelectTrigger className="w-32" aria-label={t("members.newRoleAria")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`members.roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending || !email}>
              <UserPlus data-icon="inline-start" />
              {t("members.add")}
            </Button>
          </form>
        )}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("members.legend")}
        </p>
      </CardContent>
    </Card>
  )
}
