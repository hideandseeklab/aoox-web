"use client"

import { FileUp, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createCertificateAction,
  deleteCertificateAction,
  replaceCertificateAction,
} from "@/features/certificate/certificate.actions"
import type { Certificate } from "@/features/certificate/certificate.entity"
import {
  EXPIRY_CLASS,
  expiryLabel,
  expiryState,
} from "@/features/certificate/certificate.format"
import { useLocale, useTranslations } from "next-intl"
import { formatDate } from "@/i18n/format"

const CERT_RE = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/
const KEY_RE =
  /-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]+-----END (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/

/** Quick client-side shape check; the API does the real validation (key match, expiry, ...). */
function checkPem(
  certificate: string,
  privateKey: string,
  t: (key: string) => string
): string | null {
  if (!CERT_RE.test(certificate)) return t("certificates.pem.certificate")
  if (/ENCRYPTED PRIVATE KEY/.test(privateKey))
    return t("certificates.pem.encryptedKey")
  if (!KEY_RE.test(privateKey)) return t("certificates.pem.key")
  return null
}

/**
 * Settings card (owner/admin): custom SSL certificates that application domains can use instead
 * of Let's Encrypt. The private key is write-only: it is sent once and never shown again.
 */
export function CertificatesCard({
  certificates,
}: {
  certificates: Certificate[]
}) {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const locale = useLocale()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("certificates.title")}</CardTitle>
            <CardDescription>{t("certificates.description")}</CardDescription>
          </div>
          <CertificateDialog
            trigger={
              <Button size="sm">
                <Plus data-icon="inline-start" />
                {t("certificates.upload")}
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {certificates.map((c) => {
            const state = expiryState(c.notAfter)
            return (
              <li key={c.id} className="space-y-1 px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={EXPIRY_CLASS[state]}
                    title={t("certificates.validUntil", {
                      date: formatDate(c.notAfter, locale),
                    })}
                  >
                    {expiryLabel(c.notAfter, t)}
                  </Badge>
                  <span className="ms-auto" />
                  <CertificateDialog
                    existing={c}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("certificates.updateAria", {
                          name: c.name,
                        })}
                        title={t("certificates.updateTitle")}
                      >
                        <RefreshCw />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("certificates.deleteAria", {
                          name: c.name,
                        })}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title={t("certificates.deleteTitle", { name: c.name })}
                    description={
                      c.usedBy > 0
                        ? t("certificates.deleteInUse", { count: c.usedBy })
                        : t("certificates.deleteDescription")
                    }
                    confirmLabel={tc("actions.delete")}
                    onConfirm={() => deleteCertificateAction(c.id)}
                  />
                </div>
                <p className="truncate text-muted-foreground">
                  {c.domains.join(", ") || c.commonName || "—"}
                </p>
                <p className="truncate text-muted-foreground">
                  {t("certificates.meta", {
                    issuer: c.issuer ?? t("certificates.unknownIssuer"),
                    date: formatDate(c.notAfter, locale),
                    usage:
                      c.usedBy > 0
                        ? t("certificates.usedBy", { count: c.usedBy })
                        : t("certificates.unused"),
                  })}
                </p>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Upload (new) or replace the content of (`existing`) a certificate. */
export function CertificateDialog({
  trigger,
  existing,
}: {
  trigger: React.ReactNode
  existing?: Certificate
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [certificate, setCertificate] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const certFile = useRef<HTMLInputElement>(null)
  const keyFile = useRef<HTMLInputElement>(null)

  // The key must not outlive the dialog: wipe everything on close and after a submit.
  const reset = () => {
    setName("")
    setCertificate("")
    setPrivateKey("")
    setError(null)
  }

  const readFile = async (
    file: File | undefined,
    set: (text: string) => void
  ) => {
    if (!file) return
    if (file.size > 100_000) return setError(t("certificates.fileTooLarge"))
    set(await file.text())
  }

  const submit = () =>
    start(async () => {
      setError(null)
      const problem = checkPem(certificate, privateKey, t)
      if (problem) return setError(problem)
      const r = existing
        ? await replaceCertificateAction(existing.id, {
            certificate,
            privateKey,
          })
        : await createCertificateAction({ name, certificate, privateKey })
      if (!r.ok) return setError(r.error)
      setOpen(false)
      reset()
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing
              ? t("certificates.dialogReplaceTitle", { name: existing.name })
              : t("certificates.dialogUploadTitle")}
          </DialogTitle>
          <DialogDescription>
            {existing
              ? t("certificates.dialogReplaceDescription")
              : t("certificates.dialogUploadDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <FieldGroup>
            {!existing && (
              <Field>
                <FieldLabel htmlFor="cert-name">{c("labels.name")}</FieldLabel>
                <Input
                  id="cert-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("certificates.namePlaceholder")}
                  autoComplete="off"
                />
              </Field>
            )}
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="cert-pem">
                  {t("certificates.certificateLabel")}
                </FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => certFile.current?.click()}
                >
                  <FileUp data-icon="inline-start" />
                  {t("certificates.chooseFile")}
                </Button>
                <input
                  ref={certFile}
                  type="file"
                  accept=".pem,.crt,.cer,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    void readFile(e.target.files?.[0], setCertificate)
                    e.target.value = ""
                  }}
                />
              </div>
              <Textarea
                id="cert-pem"
                value={certificate}
                onChange={(e) => setCertificate(e.target.value)}
                rows={5}
                spellCheck={false}
                placeholder="-----BEGIN CERTIFICATE-----"
                className="font-mono"
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="cert-key">
                  {t("certificates.privateKeyLabel")}
                </FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => keyFile.current?.click()}
                >
                  <FileUp data-icon="inline-start" />
                  {t("certificates.chooseFile")}
                </Button>
                <input
                  ref={keyFile}
                  type="file"
                  accept=".pem,.key,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    void readFile(e.target.files?.[0], setPrivateKey)
                    e.target.value = ""
                  }}
                />
              </div>
              <Textarea
                id="cert-key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={5}
                spellCheck={false}
                autoComplete="off"
                placeholder="-----BEGIN PRIVATE KEY-----"
                className="font-mono"
              />
              <FieldDescription>{t("certificates.keyHelp")}</FieldDescription>
            </Field>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              {c("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !certificate.trim() ||
                !privateKey.trim() ||
                (!existing && !name.trim())
              }
            >
              {pending
                ? c("states.saving")
                : existing
                  ? t("certificates.update")
                  : t("certificates.upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
