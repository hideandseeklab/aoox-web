"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateInstanceEnvAction } from "@/features/instance-env/instance-env.actions"
import type { InstanceEnvStatus } from "@/features/instance-env/instance-env.entity"

/**
 * A dashboard-editable subset of the panel's own .env.dist, instead of
 * hand-editing it over SSH — mirrors panel-domain-card.tsx. Saving a section
 * recreates the api container (the only service any of these variables are
 * wired into), so the connection drops for a few seconds; that's expected.
 */
export function InstanceEnvCard({ status }: { status: InstanceEnvStatus }) {
  const t = useTranslations("infra.env")
  const code = (c: React.ReactNode) => <code>{c}</code>
  const [pending, start] = useTransition()
  const [savedSection, setSavedSection] = useState<"terminal" | "misc" | null>(
    null
  )

  const [sshHost, setSshHost] = useState(status.terminalSshHost ?? "")
  const [sshPort, setSshPort] = useState(status.terminalSshPort ?? "")
  const [sshUser, setSshUser] = useState(status.terminalSshUser ?? "")
  const [sshPassword, setSshPassword] = useState("")

  const [publicIp, setPublicIp] = useState(status.publicIp ?? "")
  const [registryPublicHost, setRegistryPublicHost] = useState(
    status.registryPublicHost ?? ""
  )

  const save = (
    section: "terminal" | "misc",
    input: Parameters<typeof updateInstanceEnvAction>[0]
  ) =>
    start(async () => {
      setSavedSection(null)
      const r = await updateInstanceEnvAction(input)
      if (r.ok) {
        setSavedSection(section)
        toast.success(t("saved"))
      } else {
        toast.error(r.error)
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t.rich("description", { code })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!status.installDirConfigured && (
          <Alert variant="destructive">
            <AlertTitle>{t("installDirTitle")}</AlertTitle>
            <AlertDescription>
              {t.rich("installDirBody", { code })}
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t("terminal.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("terminal.description")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-host">{t("terminal.host")}</Label>
              <Input
                id="env-ssh-host"
                value={sshHost}
                onChange={(e) => setSshHost(e.target.value)}
                placeholder="203.0.113.10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-port">{t("terminal.port")}</Label>
              <Input
                id="env-ssh-port"
                type="number"
                min={1}
                max={65535}
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                placeholder="22"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-user">{t("terminal.user")}</Label>
              <Input
                id="env-ssh-user"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value)}
                placeholder={t("terminal.userPlaceholder", {
                  user: status.terminalSshUserDefault,
                })}
              />
              {status.terminalSshUser === null && (
                <p className="text-xs text-muted-foreground">
                  {t.rich("terminal.userEmpty", {
                    user: status.terminalSshUserDefault,
                    code,
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t.rich("terminal.userHint", { code })}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-password">
                {t("terminal.password")}{" "}
                {status.terminalSshPasswordSet && (
                  <span className="text-muted-foreground">
                    {t("terminal.passwordSet")}
                  </span>
                )}
              </Label>
              <Input
                id="env-ssh-password"
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder={
                  status.terminalSshPasswordSet
                    ? t("terminal.passwordKeep")
                    : t("terminal.passwordOptional")
                }
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={pending || !status.installDirConfigured}
            onClick={() =>
              save("terminal", {
                terminalSshHost: sshHost.trim(),
                ...(sshPort !== "" ? { terminalSshPort: Number(sshPort) } : {}),
                terminalSshUser: sshUser.trim(),
                ...(sshPassword.trim()
                  ? { terminalSshPassword: sshPassword.trim() }
                  : {}),
              })
            }
          >
            {t("terminal.save")}
          </Button>
          {savedSection === "terminal" && (
            <Alert>
              <AlertTitle>{t("applied")}</AlertTitle>
              <AlertDescription>{t("appliedBody")}</AlertDescription>
            </Alert>
          )}
        </section>

        <section className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium">{t("network.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("network.description")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="env-public-ip">{t("network.publicIp")}</Label>
              <Input
                id="env-public-ip"
                value={publicIp}
                onChange={(e) => setPublicIp(e.target.value)}
                placeholder={t("network.publicIpPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-registry-public-host">
                {t("network.registryHost")}
              </Label>
              <Input
                id="env-registry-public-host"
                value={registryPublicHost}
                onChange={(e) => setRegistryPublicHost(e.target.value)}
                placeholder="localhost"
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={pending || !status.installDirConfigured}
            onClick={() =>
              save("misc", {
                publicIp: publicIp.trim(),
                registryPublicHost: registryPublicHost.trim(),
              })
            }
          >
            {t("network.save")}
          </Button>
          {savedSection === "misc" && (
            <Alert>
              <AlertTitle>{t("applied")}</AlertTitle>
              <AlertDescription>{t("appliedBody")}</AlertDescription>
            </Alert>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
