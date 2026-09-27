"use client"

import { useState, useTransition } from "react"
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
import { updatePanelDomainAction } from "@/features/panel-domain/panel-domain.actions"
import type { PanelDomainStatus } from "@/features/panel-domain/panel-domain.entity"

/**
 * Lets the owner point the panel itself (this dashboard + its API) at a
 * custom domain, instead of hand-editing docker-compose.domain.yml/.env.dist
 * over SSH. Saving recreates the web/api containers, so the browser loses the
 * connection for a few seconds — that's expected, not an error.
 */
export function PanelDomainCard({ status }: { status: PanelDomainStatus }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [proxyAutoProvisioned, setProxyAutoProvisioned] = useState(false)
  const [webHost, setWebHost] = useState(status.settings.webHost ?? "")
  const [apiHost, setApiHost] = useState(status.settings.apiHost ?? "")
  const [acmeEmail, setAcmeEmail] = useState(status.settings.acmeEmail ?? "")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain panel</CardTitle>
        <CardDescription>
          Akses dashboard dan API ini lewat domain sendiri, bukan{" "}
          <code>{`IP:port`}</code>. Butuh dua DNS A record (dashboard dan API)
          mengarah ke server ini, dan <code>INSTALL_DIR</code> sudah diisi di{" "}
          <code>.env.dist</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.installDirConfigured && (
          <Alert variant="destructive">
            <AlertTitle>INSTALL_DIR belum diisi</AlertTitle>
            <AlertDescription>
              Set <code>INSTALL_DIR</code> di <code>.env.dist</code> ke path
              absolut folder yang berisi <code>docker-compose.dist.yml</code>{" "}
              di server ini, lalu restart stack sebelum menyimpan domain di
              sini.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pd-web">Domain dashboard</Label>
            <Input
              id="pd-web"
              value={webHost}
              onChange={(e) => setWebHost(e.target.value)}
              placeholder="panel.example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-api">Domain API</Label>
            <Input
              id="pd-api"
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              placeholder="api.example.com"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pd-acme">Email ACME (Let&apos;s Encrypt)</Label>
            <Input
              id="pd-acme"
              type="email"
              value={acmeEmail}
              onChange={(e) => setAcmeEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Saat ini terpasang:{" "}
          <code>{status.applied.webOrigin ?? "http://localhost:3000"}</code> ·{" "}
          <code>{status.applied.publicApiUrl ?? "http://localhost:3001"}</code>
        </p>

        <Button
          size="sm"
          disabled={
            pending || !status.installDirConfigured || !webHost || !apiHost
          }
          onClick={() =>
            start(async () => {
              setError(null)
              setApplied(false)
              setProxyAutoProvisioned(false)
              const r = await updatePanelDomainAction({
                webHost: webHost.trim(),
                apiHost: apiHost.trim(),
                ...(acmeEmail.trim() ? { acmeEmail: acmeEmail.trim() } : {}),
              })
              if (r.ok) {
                setApplied(true)
                setProxyAutoProvisioned(r.data.proxyAutoProvisioned)
              } else setError(r.error)
            })
          }
        >
          {pending ? "Menyimpan…" : "Simpan & terapkan"}
        </Button>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {applied && (
          <Alert>
            <AlertTitle>Diterapkan</AlertTitle>
            <AlertDescription>
              Panel akan restart beberapa detik lagi untuk memasang domain
              baru — koneksi ke dashboard ini akan sempat terputus, itu wajar.
              Muat ulang halaman di <code>https://{webHost}</code> setelah
              itu.
            </AlertDescription>
          </Alert>
        )}
        {applied && proxyAutoProvisioned && (
          <Alert variant="destructive">
            <AlertTitle>Reverse proxy belum aktif — sudah dinyalakan otomatis</AlertTitle>
            <AlertDescription>
              <p>
                Proxy (Traefik) belum jalan sebelum ini, jadi sudah diaktifkan
                otomatis untuk kamu. Tapi domain baru bisa diakses kalau tiga
                hal ini juga sudah benar — cek satu per satu kalau{" "}
                <code>https://{webHost}</code> belum bisa dibuka setelah
                beberapa menit:
              </p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>
                  DNS A record <code>{webHost}</code> dan{" "}
                  <code>{apiHost}</code> sudah mengarah ke IP server ini
                  (cek: <code>nslookup {webHost || "domain-kamu"}</code>).
                </li>
                <li>
                  Port <code>80</code> dan <code>443</code> terbuka untuk
                  publik — baik firewall OS (<code>ufw</code>) maupun
                  firewall/security group dari provider VPS kamu.
                </li>
                <li>
                  Tunggu beberapa saat: sertifikat HTTPS (Let&apos;s Encrypt)
                  baru diterbitkan Traefik saat pertama kali domain diakses,
                  butuh beberapa detik sampai semenit.
                </li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
