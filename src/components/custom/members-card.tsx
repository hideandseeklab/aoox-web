"use client"

import {
  Copy,
  KeyRound,
  Plus,
  ShieldOff,
  Trash2,
  UserRound,
} from "lucide-react"
import { useActionState, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
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
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isOwner = me.role === "owner"
  const pendingInvites = invitations.filter((i) => i.pending)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Anggota</CardTitle>
            <CardDescription>
              Semua anggota melihat semua project. Owner/admin mengelola
              komponen platform; hanya owner yang mengubah peran.
            </CardDescription>
          </div>
          <InviteDialog isOwner={isOwner} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2">
              <UserRound className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.name ?? m.email}
                  {m.id === me.id && (
                    <span className="text-muted-foreground"> (kamu)</span>
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
                  <SelectTrigger size="sm" aria-label={`Peran ${m.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                    aria-label={`Set password ${m.email}`}
                    title="Set password baru (reset)"
                    disabled={pending}
                    onClick={() => {
                      const pw = prompt(
                        `Password baru untuk ${m.email} (min. 8 karakter). Sampaikan ke orangnya secara langsung.`
                      )
                      if (!pw) return
                      run(() => setUserPasswordAction(m.id, pw))
                    }}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Nonaktifkan 2FA ${m.email}`}
                    title="Nonaktifkan 2FA (kalau authenticator hilang)"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Nonaktifkan 2FA untuk ${m.email}?`)) return
                      run(() => disableUserTwoFactorAction(m.id))
                    }}
                  >
                    <ShieldOff />
                  </Button>
                </>
              )}
              {isOwner && m.id !== me.id && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${m.email}`}
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Hapus akun ${m.email}?`)) return
                    run(() => deleteMemberAction(m.id))
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {pendingInvites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground">Undangan menunggu</p>
            <ul className="divide-y rounded-md border">
              {pendingInvites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="truncate">{i.email}</span>
                  <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    sampai {new Date(i.expiresAt).toLocaleDateString()}
                  </span>
                  <span className="ms-auto" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Batalkan undangan ${i.email}`}
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
          Undang
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Undang anggota</DialogTitle>
          <DialogDescription>
            Tautan undangan berlaku 7 hari dan hanya ditampilkan sekali —
            kirimkan sendiri ke orangnya.
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3 text-sm">
            <p>
              Undangan untuk <strong>{state.created?.email}</strong> sebagai{" "}
              {ROLE_LABEL[state.created!.role]}:
            </p>
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
                {link}
              </pre>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Salin tautan"
                onClick={() => void navigator.clipboard.writeText(link)}
              >
                <Copy />
              </Button>
            </div>
            {!state.created?.acceptUrl && (
              <p className="text-xs text-muted-foreground">
                <code>WEB_ORIGIN</code> tidak diset di API, jadi hanya token
                yang tersedia; buka <code>/invite/&lt;token&gt;</code> di web
                ini.
              </p>
            )}
          </div>
        ) : (
          <form action={action} noValidate>
            <FieldGroup>
              <Field data-invalid={!!state.fieldErrors?.email || undefined}>
                <FieldLabel htmlFor="inv-email">Email</FieldLabel>
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
                <FieldLabel htmlFor="inv-role">Peran</FieldLabel>
                <Select
                  name="role"
                  defaultValue={state.values?.role ?? "member"}
                >
                  <SelectTrigger id="inv-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      Member — project & deploy
                    </SelectItem>
                    <SelectItem value="admin">
                      Admin — + registry, server, notifikasi, terminal
                    </SelectItem>
                    {isOwner && (
                      <SelectItem value="owner">Owner — semuanya</SelectItem>
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
                  {pending ? "Membuat…" : "Buat tautan"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
