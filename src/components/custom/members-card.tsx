"use client"

import {
  Copy,
  KeyRound,
  Plus,
  ShieldOff,
  Trash2,
  UserRound,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useActionState, useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  disableUserTwoFactorAction,
  setUserPasswordAction,
} from "@/features/account/account.actions"
import type { AuthUser, UserRole } from "@/features/auth/auth.entity"
import {
  createInvitationAction,
  deleteMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  type InviteFormState,
} from "@/features/member/member.actions"
import {
  ROLE_LABEL,
  type Invitation,
  type Member,
} from "@/features/member/member.entity"
import { formatDate } from "@/i18n/format"
import { copyToClipboard } from "@/lib/clipboard"

/**
 * Settings card: who can sign in to this instance and with which role.
 * Everyone sees every project; owner/admin manage platform resources
 * (proxy, registry, servers, notifications), owner alone manages roles.
 */
export function MembersCard({
  me,
  members,
  invitations,
}: {
  me: AuthUser
  members: Member[]
  invitations: Invitation[]
}) {
  const t = useTranslations("settings")
  const locale = useLocale()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isOwner = me.role === "owner"
  const pendingInvites = invitations.filter((i) => i.pending)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("errors.failed"))
    })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("members.title")}</CardTitle>
            <CardDescription>{t("members.description")}</CardDescription>
          </div>
          <InviteDialog isOwner={isOwner} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2">
              <UserRound className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.name ?? m.email}
                  {m.id === me.id && (
                    <span className="text-muted-foreground">
                      {" "}
                      {t("members.you")}
                    </span>
                  )}
                </p>
                {m.name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                )}
              </div>
              <span className="ms-auto" />
              {isOwner && m.id !== me.id ? (
                <Select
                  value={m.role}
                  disabled={pending}
                  onValueChange={(role) =>
                    run(() => updateMemberRoleAction(m.id, role as UserRole))
                  }
                >
                  <SelectTrigger
                    size="sm"
                    aria-label={t("members.roleAria", { email: m.email })}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
              )}
              {isOwner && m.id !== me.id && m.role !== "owner" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("members.setPasswordAria", {
                      email: m.email,
                    })}
                    title={t("members.setPasswordTitle")}
                    disabled={pending}
                    onClick={() => {
                      const pw = prompt(
                        t("members.setPasswordPrompt", { email: m.email })
                      )
                      if (!pw) return
                      run(() => setUserPasswordAction(m.id, pw))
                    }}
                  >
                    <KeyRound />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("members.disable2faAria", {
                          email: m.email,
                        })}
                        title={t("members.disable2faTitle")}
                        disabled={pending}
                      >
                        <ShieldOff />
                      </Button>
                    }
                    title={t("members.disable2faDialogTitle", {
                      email: m.email,
                    })}
                    description={t("members.disable2faDescription")}
                    confirmLabel={t("members.disable2faConfirm")}
                    onConfirm={() => disableUserTwoFactorAction(m.id)}
                  />
                </>
              )}
              {isOwner && m.id !== me.id && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("members.deleteAria", { email: m.email })}
                      disabled={pending}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title={t("members.deleteTitle", { email: m.email })}
                  description={t("members.deleteDescription")}
                  confirmLabel={t("members.deleteConfirm")}
                  onConfirm={() => deleteMemberAction(m.id)}
                />
              )}
            </li>
          ))}
        </ul>

        {pendingInvites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground">
              {t("members.pendingInvites")}
            </p>
            <ul className="divide-y rounded-md border">
              {pendingInvites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="truncate">{i.email}</span>
                  <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("members.until", {
                      date: formatDate(i.expiresAt, locale),
                    })}
                  </span>
                  <span className="ms-auto" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("members.revokeAria", { email: i.email })}
                    disabled={pending}
                    onClick={() => run(() => revokeInvitationAction(i.id))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const initialState: InviteFormState = {}

function InviteDialog({ isOwner }: { isOwner: boolean }) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    createInvitationAction,
    initialState
  )
  const errs = (k: "email" | "role") =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))
  const link = state.created?.acceptUrl ?? state.created?.token ?? null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          {t("members.invite.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("members.invite.title")}</DialogTitle>
          <DialogDescription>
            {t("members.invite.description")}
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3 text-xs">
            <p>
              {t.rich("members.invite.created", {
                b: (chunks) => <strong>{chunks}</strong>,
                email: state.created?.email ?? "",
                role: ROLE_LABEL[state.created!.role],
              })}
            </p>
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
                {link}
              </pre>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("members.invite.copyAria")}
                onClick={() =>
                  void copyToClipboard(link).then((ok) =>
                    ok
                      ? toast.success(t("members.invite.copied"))
                      : toast.error(t("members.invite.copyFailed"))
                  )
                }
              >
                <Copy />
              </Button>
            </div>
            {!state.created?.acceptUrl && (
              <p className="text-xs text-muted-foreground">
                {t.rich("members.invite.noOrigin", {
                  code: (chunks) => <code>{chunks}</code>,
                  path: "/invite/<token>",
                })}
              </p>
            )}
          </div>
        ) : (
          <form action={action} noValidate>
            <FieldGroup>
              <Field data-invalid={!!state.fieldErrors?.email || undefined}>
                <FieldLabel htmlFor="inv-email">{c("labels.email")}</FieldLabel>
                <Input
                  id="inv-email"
                  name="email"
                  type="email"
                  defaultValue={state.values?.email}
                  required
                  autoFocus
                />
                <FieldError errors={errs("email")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="inv-role">{c("labels.role")}</FieldLabel>
                <Select
                  name="role"
                  defaultValue={state.values?.role ?? "member"}
                >
                  <SelectTrigger id="inv-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="member">
                      {t("members.invite.roleMember")}
                    </SelectItem>
                    <SelectItem value="admin">
                      {t("members.invite.roleAdmin")}
                    </SelectItem>
                    {isOwner && (
                      <SelectItem value="owner">
                        {t("members.invite.roleOwner")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              {state.error && (
                <FieldDescription className="text-destructive" role="alert">
                  {state.error}
                </FieldDescription>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? c("states.creating") : t("members.invite.submit")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
