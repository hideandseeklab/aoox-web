"use client"

import { Check, Copy, ShieldCheck, ShieldOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  changePasswordAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  setupTwoFactorAction,
  type TwoFactorSetup,
} from "@/features/account/account.actions"
import type { AuthUser } from "@/features/auth/auth.entity"
import { copyToClipboard } from "@/lib/clipboard"

/** Own account: password change and TOTP two-factor (setup → confirm → backup codes). */
export function AccountCard({ me }: { me: AuthUser }) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disablePw, setDisablePw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    done?: () => void
  ) =>
    start(async () => {
      setError(null)
      setNotice(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("errors.failed"))
      else done?.()
    })

  const copyCodes = async () => {
    if (!backupCodes) return
    const ok = await copyToClipboard(backupCodes.join("\n"))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(t("account.backup.copied"))
    } else {
      toast.error(t("account.backup.copyFailed"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.title")}</CardTitle>
        <CardDescription>
          {me.email} · {me.role}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(
              () => changePasswordAction(current, next),
              () => {
                setCurrent("")
                setNext("")
                setNotice(t("account.passwordChanged"))
              }
            )
          }}
        >
          <p className="text-sm font-medium">{t("account.changePassword")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="acc-current">
                {t("account.currentPassword")}
              </Label>
              <Input
                id="acc-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acc-next">{t("account.newPassword")}</Label>
              <Input
                id="acc-next"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {t("account.savePassword")}
          </Button>
        </form>

        <div className="space-y-3 border-t pt-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {t("account.twoFactor.title")}
            </p>
            {me.twoFactorEnabled ? (
              <Badge>{t("account.twoFactor.on")}</Badge>
            ) : (
              <Badge variant="outline">{t("account.twoFactor.off")}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("account.twoFactor.description")}
          </p>
          <div className="flex justify-end">
          {me.twoFactorEnabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setDisablePw("")}
            >
              <ShieldOff data-icon="inline-start" />
              {t("account.twoFactor.disable")}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const r = await setupTwoFactorAction()
                  if (!r.ok) setError(r.error)
                  else {
                    setSetup(r.data)
                    setCode("")
                  }
                })
              }
            >
              <ShieldCheck data-icon="inline-start" />
              {t("account.twoFactor.enable")}
            </Button>
          )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
      </CardContent>

      {/* Setup: scan QR, confirm with a code */}
      <Dialog
        open={setup !== null && backupCodes === null}
        onOpenChange={(o) => !o && setSetup(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("account.setup.title")}</DialogTitle>
            <DialogDescription>
              {t("account.setup.description")}
            </DialogDescription>
          </DialogHeader>
          {setup && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                run(async () => {
                  const r = await enableTwoFactorAction(code)
                  if (r.ok) setBackupCodes(r.data)
                  return r
                })
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrDataUrl}
                alt={t("account.setup.qrAlt")}
                width={192}
                height={192}
                className="mx-auto rounded bg-white p-2"
              />
              <p className="text-center font-mono text-xs break-all text-muted-foreground">
                {setup.secret}
              </p>
              <div className="space-y-1">
                <Label htmlFor="acc-code">{t("account.setup.code")}</Label>
                <Input
                  id="acc-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSetup(null)}
                >
                  {c("actions.cancel")}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? t("account.setup.checking") : c("actions.confirm")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup codes, shown once */}
      <Dialog
        open={backupCodes !== null}
        onOpenChange={(o) => {
          if (!o) {
            setBackupCodes(null)
            setSetup(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("account.backup.title")}</DialogTitle>
            <DialogDescription>
              {t("account.backup.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1 rounded bg-muted p-3 font-mono text-xs">
            {backupCodes?.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCodes}>
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {c("actions.copy")}
            </Button>
            <Button
              onClick={() => {
                setBackupCodes(null)
                setSetup(null)
              }}
            >
              {t("account.backup.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable: confirm with password */}
      <Dialog
        open={disablePw !== null}
        onOpenChange={(o) => !o && setDisablePw(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("account.disableDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("account.disableDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              run(
                () => disableTwoFactorAction(disablePw ?? ""),
                () => setDisablePw(null)
              )
            }}
          >
            <Input
              type="password"
              autoComplete="current-password"
              value={disablePw ?? ""}
              onChange={(e) => setDisablePw(e.target.value)}
              placeholder={c("labels.password")}
              required
            />
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisablePw(null)}
              >
                {c("actions.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {c("actions.disable")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
