"use client"

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
        toast.success("Disimpan — API akan restart sebentar untuk menerapkannya")
      } else {
        toast.error(r.error)
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment</CardTitle>
        <CardDescription>
          Sebagian env var instance yang bisa diubah dari sini, tanpa SSH ke{" "}
          <code>.env.dist</code>. Menyimpan me-restart container API sebentar
          untuk menerapkan nilai baru.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!status.installDirConfigured && (
          <Alert variant="destructive">
            <AlertTitle>INSTALL_DIR belum diisi</AlertTitle>
            <AlertDescription>
              Set <code>INSTALL_DIR</code> di <code>.env.dist</code> ke path
              absolut folder <code>docker-compose.dist.yml</code> di server
              ini, lalu restart stack sebelum menyimpan dari sini.
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">SSH Terminal (ke host)</h3>
            <p className="text-xs text-muted-foreground">
              Fitur Terminal web selalu masuk lewat SSH (container tidak bisa
              membuka shell host langsung). Isi ini supaya bisa dipakai.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-host">Host</Label>
              <Input
                id="env-ssh-host"
                value={sshHost}
                onChange={(e) => setSshHost(e.target.value)}
                placeholder="203.0.113.10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-port">Port</Label>
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
              <Label htmlFor="env-ssh-user">User</Label>
              <Input
                id="env-ssh-user"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value)}
                placeholder="root"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-ssh-password">
                Password{" "}
                {status.terminalSshPasswordSet && (
                  <span className="text-muted-foreground">(sudah diisi)</span>
                )}
              </Label>
              <Input
                id="env-ssh-password"
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder={
                  status.terminalSshPasswordSet
                    ? "•••••••• (kosongkan agar tidak berubah)"
                    : "opsional — bisa juga pakai SSH key platform"
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
            Simpan SSH Terminal
          </Button>
          {savedSection === "terminal" && (
            <Alert>
              <AlertTitle>Diterapkan</AlertTitle>
              <AlertDescription>
                Container API akan restart beberapa detik lagi — koneksi ke
                dashboard ini bisa sempat terputus, itu wajar.
              </AlertDescription>
            </Alert>
          )}
        </section>

        <section className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium">Jaringan</h3>
            <p className="text-xs text-muted-foreground">
              Dipakai untuk cek DNS domain aplikasi dan alamat registry lokal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="env-public-ip">Public IP</Label>
              <Input
                id="env-public-ip"
                value={publicIp}
                onChange={(e) => setPublicIp(e.target.value)}
                placeholder="kosong = deteksi otomatis"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-registry-public-host">
                Registry public host
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
            Simpan Jaringan
          </Button>
          {savedSection === "misc" && (
            <Alert>
              <AlertTitle>Diterapkan</AlertTitle>
              <AlertDescription>
                Container API akan restart beberapa detik lagi — koneksi ke
                dashboard ini bisa sempat terputus, itu wajar.
              </AlertDescription>
            </Alert>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
