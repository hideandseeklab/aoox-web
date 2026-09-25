"use client"

import { Check, Copy, ShieldCheck, ShieldOff } from "lucide-react"
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

/** Own account: password change and TOTP two-factor (setup → confirm → backup codes). */
export function AccountCard({ me }: { me: AuthUser }) {
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
      if (!r.ok) setError(r.error ?? "Gagal")
      else done?.()
    })

  const copyCodes = async () => {
    if (!backupCodes) return
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; codes remain visible */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akun</CardTitle>
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
                setNotice("Password diganti.")
              }
            )
          }}
        >
          <p className="text-sm font-medium">Ganti password</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="acc-current">Password sekarang</Label>
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
              <Label htmlFor="acc-next">Password baru (min. 8)</Label>
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
            Simpan password
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Verifikasi dua langkah (2FA)</p>
            {me.twoFactorEnabled ? (
              <Badge>aktif</Badge>
            ) : (
              <Badge variant="outline">nonaktif</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Kode TOTP dari aplikasi authenticator (Google Authenticator, Aegis,
            1Password, …) diminta setiap masuk. API token tidak terpengaruh.
          </p>
          {me.twoFactorEnabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setDisablePw("")}
            >
              <ShieldOff data-icon="inline-start" />
              Nonaktifkan 2FA
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
              Aktifkan 2FA
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      </CardContent>

      {/* Setup: scan QR, confirm with a code */}
      <Dialog
        open={setup !== null && backupCodes === null}
        onOpenChange={(o) => !o && setSetup(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aktifkan 2FA</DialogTitle>
            <DialogDescription>
              Pindai QR ini dengan aplikasi authenticator, lalu masukkan kode 6
              digit yang muncul.
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
                alt="QR code 2FA"
                width={192}
                height={192}
                className="mx-auto rounded bg-white p-2"
              />
              <p className="text-center font-mono text-xs break-all text-muted-foreground">
                {setup.secret}
              </p>
              <div className="space-y-1">
                <Label htmlFor="acc-code">Kode</Label>
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
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSetup(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Memeriksa…" : "Konfirmasi"}
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
            <DialogTitle>2FA aktif — simpan kode cadangan</DialogTitle>
            <DialogDescription>
              Tiap kode hanya bisa dipakai sekali, untuk masuk saat
              authenticator tidak ada. Tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1 rounded bg-muted p-3 font-mono text-sm">
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
              Salin
            </Button>
            <Button
              onClick={() => {
                setBackupCodes(null)
                setSetup(null)
              }}
            >
              Selesai
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
            <DialogTitle>Nonaktifkan 2FA?</DialogTitle>
            <DialogDescription>
              Masukkan password untuk mengonfirmasi. Rahasia dan kode cadangan
              akan dihapus.
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
              placeholder="Password"
              required
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisablePw(null)}
              >
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                Nonaktifkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
