"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EnvEditor } from "@/components/custom/env-editor"
import { ImagePickerDialog } from "@/components/custom/image-picker-dialog"
import { useBrowserHost } from "@/components/custom/use-browser-host"
import type {
  ActionResult,
  ApplicationFormState,
} from "@/features/application/application.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Registry } from "@/features/registry/registry.entity"
import type { Server } from "@/features/server/server.entity"
import type { SwarmNode } from "@/features/swarm/swarm.entity"

type Akses = "port" | "domain" | "later"

type Values = NonNullable<ApplicationFormState["values"]>

const EMPTY: Values = {
  name: "",
  gitUrl: "",
  gitBranch: "main",
  dockerfilePath: "Dockerfile",
  gitCredentialId: "",
  containerPort: "3000",
  hostPort: "",
  healthcheckPath: "",
  cpuMillicores: "",
  memoryMb: "",
  deploymentKeep: "10",
  env: "",
  buildArgs: "",
  buildType: "dockerfile",
  sourceType: "git",
  imageRef: "",
  imageRegistryId: "",
  autoUpdate: "",
  autoUpdateIntervalMinutes: "60",
  deployMode: "container",
  replicas: "1",
  swarmNodeId: "",
  swarmConstraint: "",
  updateParallelism: "1",
  updateDelaySeconds: "2",
  updateOrder: "auto",
  staticBuildCommand: "",
  staticOutputDir: "dist",
  staticSpa: "on",
  serverId: "",
  previewsEnabled: "",
  previewDomain: "",
  ignoreErrorLogs: "",
}

export function ApplicationForm({
  action,
  mode = "edit",
  defaultValues,
  submitLabel,
  credentials,
  databaseSlugs,
  servers = [],
  registries = [],
  swarmActive = false,
  swarmNodes = [],
  proxy,
  onCreateWithDomain,
  onPendingChange,
  cancelHref,
}: {
  action: (
    prev: ApplicationFormState,
    formData: FormData
  ) => Promise<ApplicationFormState>
  /** Create mode adds the "Akses" step (host port / domain / later). */
  mode?: "create" | "edit"
  defaultValues?: Partial<Values>
  submitLabel: string
  credentials: GitCredential[]
  /** Managed database slugs in this project, for the reference hint. */
  databaseSlugs?: string[]
  /** Registries whose credentials can pull a private image (Registry page). */
  registries?: Registry[]
  /** Remote servers (Settings); empty = only the aoox host. */
  servers?: Server[]
  /** Host is a swarm manager: offer deployMode 'service' + replicas. */
  swarmActive?: boolean
  /** Nodes to pin a service to (from the swarm status). */
  swarmNodes?: SwarmNode[]
  /** Create mode only: whether HTTPS/domains can actually work right now. */
  proxy?: Pick<ProxyStatus, "running" | "acmeEmail">
  /**
   * Create mode, "Domain" access option only: creates the app (without a
   * host port), then adds the domain, then navigates — `createApplicationAction`
   * can't be reused here because it redirects on success, which would abort
   * before the add-domain call.
   */
  onCreateWithDomain?: (
    formData: FormData,
    toastId: string | number
  ) => Promise<ActionResult>
  /** Create mode only: lets the dialog lock its close/cancel button while a submission is in flight. */
  onPendingChange?: (pending: boolean) => void
  /** Standalone create page only: renders a "Batal" link back to the project. */
  cancelHref?: string
}) {
  const initial = { ...EMPTY, ...defaultValues }
  const [state, formAction, pending] = useActionState(action, {
    values: initial,
  })
  const router = useRouter()
  const toastIdRef = useRef<string | number | undefined>(undefined)
  const wasPendingRef = useRef(false)
  const v = state.values ?? initial
  const [buildType, setBuildType] = useState(v.buildType)
  const [sourceType, setSourceType] = useState(v.sourceType)
  const [deployMode, setDeployMode] = useState(v.deployMode)
  const [imageRef, setImageRef] = useState(v.imageRef)
  const [imageRegistryId, setImageRegistryId] = useState(
    v.imageRegistryId || "public"
  )
  const [akses, setAkses] = useState<Akses>(v.hostPort ? "port" : "later")
  const [domainHost, setDomainHost] = useState("")
  const [domainHttps, setDomainHttps] = useState(false)
  const [domainPending, setDomainPending] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)
  const browserHost = useBrowserHost()
  const errs = (k: keyof Values) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))
  const invalid = (k: keyof Values) => !!state.fieldErrors?.[k] || undefined
  // The API doesn't (yet) shape port-conflict errors as a field error, so a
  // generic create/update failure that mentions "port" is shown next to the
  // host port input instead of the generic banner at the bottom.
  const portConflict =
    !!state.error &&
    /port/i.test(state.error) &&
    (mode === "edit" || akses === "port")
  const domainMode = mode === "create" && akses === "domain"

  // Plain create (IP+port / later): the action no longer redirects itself
  // (a server `redirect()` would abort before this toast could be resolved,
  // per the "Domain" option's comment above), so navigation happens here
  // once the row exists — the app keeps provisioning in the background.
  useEffect(() => {
    if (mode !== "create" || domainMode) return
    if (wasPendingRef.current && !pending) {
      if (state.createdId) {
        toast.success(`Aplikasi "${state.values?.name ?? ""}" dibuat.`, {
          id: toastIdRef.current,
        })
        router.push(`/applications/${state.createdId}`)
      } else if (state.error || state.fieldErrors) {
        toast.error(state.error ?? "Periksa isian form", {
          id: toastIdRef.current,
        })
      }
    }
    wasPendingRef.current = pending
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a pending->settled transition
  }, [pending])

  useEffect(() => {
    onPendingChange?.(domainMode ? domainPending : pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, domainPending, domainMode])

  const submitCreate = (e: FormEvent<HTMLFormElement>) => {
    if (mode !== "create" || domainMode) return
    const formData = new FormData(e.currentTarget)
    toastIdRef.current = toast.loading(
      `Membuat aplikasi ${String(formData.get("name") || "").trim() || "baru"}…`
    )
  }

  const submitDomain = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onCreateWithDomain) return
    if (!domainHost.trim()) {
      setDomainError("Host wajib diisi")
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set("hostPort", "")
    formData.set("domainHost", domainHost.trim())
    formData.set("domainHttps", domainHttps ? "on" : "")
    setDomainError(null)
    setDomainPending(true)
    const toastId = toast.loading(
      `Membuat aplikasi ${String(formData.get("name") || "").trim() || "baru"}…`
    )
    onCreateWithDomain(formData, toastId).then((r) => {
      setDomainPending(false)
      if (!r.ok) setDomainError(r.error)
    })
  }

  return (
    <form
      action={domainMode ? undefined : formAction}
      onSubmit={domainMode ? submitDomain : submitCreate}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="app-name">Nama</FieldLabel>
          <Input id="app-name" name="name" defaultValue={v.name} required />
          <FieldError errors={errs("name")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="app-source">Sumber</FieldLabel>
          <Select
            name="sourceType"
            value={sourceType}
            onValueChange={(t) => setSourceType(t as typeof sourceType)}
          >
            <SelectTrigger id="app-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="git">Repo git (di-build)</SelectItem>
              <SelectItem value="image">Image siap pakai (di-pull)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {sourceType === "image" && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field data-invalid={invalid("imageRef")}>
              <FieldLabel htmlFor="app-image">Image</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="app-image"
                  name="imageRef"
                  placeholder="ghcr.io/org/app:1.2 atau nginx:1.27"
                  value={imageRef}
                  onChange={(e) => setImageRef(e.target.value)}
                  className="font-mono"
                />
                {registries.length > 0 && (
                  <ImagePickerDialog
                    registries={registries}
                    onPick={(ref, registryId) => {
                      setImageRef(ref)
                      setImageRegistryId(registryId)
                    }}
                  />
                )}
              </div>
              <FieldDescription>
                Di-pull ulang tiap deploy, jadi tag bergerak seperti{" "}
                <code>latest</code> ikut terbarui. Tanpa build & registry lokal.
              </FieldDescription>
              <FieldError errors={errs("imageRef")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="app-image-registry">Kredensial</FieldLabel>
              <Select
                name="imageRegistryId"
                value={imageRegistryId}
                onValueChange={setImageRegistryId}
              >
                <SelectTrigger id="app-image-registry" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Publik</SelectItem>
                  {registries.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              className="sm:col-span-2"
              data-invalid={invalid("autoUpdateIntervalMinutes")}
            >
              <FieldLabel>Update otomatis</FieldLabel>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    name="autoUpdate"
                    defaultChecked={v.autoUpdate === "on"}
                  />
                  Deploy ulang saat digest tag berubah di registry
                </label>
                <span className="flex items-center gap-2">
                  cek tiap
                  <Input
                    name="autoUpdateIntervalMinutes"
                    type="number"
                    min={5}
                    max={1440}
                    defaultValue={v.autoUpdateIntervalMinutes}
                    className="w-20"
                    aria-label="Interval cek (menit)"
                  />
                  menit
                </span>
              </div>
              <FieldDescription>
                Seperti Watchtower: digest manifest dibandingkan lewat registry
                API (Docker Hub, GHCR, registry lokal), tanpa pull. Tag yang
                dipin digest (<code>@sha256:…</code>) tidak pernah berubah.
              </FieldDescription>
              <FieldError errors={errs("autoUpdateIntervalMinutes")} />
            </Field>
          </div>
        )}

        <div className={sourceType === "image" ? "hidden" : "contents"}>
          <Field data-invalid={invalid("gitUrl")}>
            <FieldLabel htmlFor="app-git">Git repository</FieldLabel>
            <Input
              id="app-git"
              name="gitUrl"
              placeholder="https://github.com/org/repo.git"
              defaultValue={v.gitUrl}
              required={sourceType === "git"}
            />
            <FieldDescription>
              Repo git yang bisa di-clone lewat HTTPS.
            </FieldDescription>
            <FieldError errors={errs("gitUrl")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalid("gitBranch")}>
              <FieldLabel htmlFor="app-branch">Branch</FieldLabel>
              <Input
                id="app-branch"
                name="gitBranch"
                defaultValue={v.gitBranch}
              />
              <FieldError errors={errs("gitBranch")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="app-build-type">Cara build</FieldLabel>
              <Select
                name="buildType"
                value={buildType}
                onValueChange={(t) => setBuildType(t as typeof buildType)}
              >
                <SelectTrigger id="app-build-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dockerfile">Dockerfile di repo</SelectItem>
                  <SelectItem value="nixpacks">
                    Nixpacks (deteksi otomatis)
                  </SelectItem>
                  <SelectItem value="railpack">
                    Railpack (deteksi otomatis, cache build)
                  </SelectItem>
                  <SelectItem value="static">Situs statis (nginx)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {buildType === "dockerfile" ? (
            <Field data-invalid={invalid("dockerfilePath")}>
              <FieldLabel htmlFor="app-dockerfile">Dockerfile</FieldLabel>
              <Input
                id="app-dockerfile"
                name="dockerfilePath"
                defaultValue={v.dockerfilePath}
              />
              <FieldError errors={errs("dockerfilePath")} />
            </Field>
          ) : buildType === "static" ? (
            <div className="space-y-4 rounded-md border p-4">
              <Field data-invalid={invalid("staticBuildCommand")}>
                <FieldLabel htmlFor="app-static-build">
                  Perintah build
                </FieldLabel>
                <Input
                  id="app-static-build"
                  name="staticBuildCommand"
                  placeholder="npm ci && npm run build (kosong = file sudah ada di repo)"
                  defaultValue={v.staticBuildCommand}
                  className="font-mono"
                />
                <FieldDescription>
                  Dijalankan di image <code>node:22-alpine</code>; hasilnya
                  disalin ke nginx. Kosongkan untuk HTML statis biasa.
                </FieldDescription>
                <FieldError errors={errs("staticBuildCommand")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={invalid("staticOutputDir")}>
                  <FieldLabel htmlFor="app-static-out">
                    Folder output
                  </FieldLabel>
                  <Input
                    id="app-static-out"
                    name="staticOutputDir"
                    placeholder="dist"
                    defaultValue={v.staticOutputDir}
                    className="font-mono"
                  />
                  <FieldDescription>
                    <code>dist</code>, <code>build</code>, <code>out</code>,
                    atau <code>.</code> untuk seluruh repo.
                  </FieldDescription>
                  <FieldError errors={errs("staticOutputDir")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="app-static-spa">Mode SPA</FieldLabel>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      id="app-static-spa"
                      name="staticSpa"
                      defaultChecked={v.staticSpa === "on"}
                    />
                    Arahkan path tak dikenal ke <code>index.html</code>
                  </label>
                  <FieldDescription>
                    Port container = 80. Nyalakan untuk React/Vue Router.
                  </FieldDescription>
                </Field>
              </div>
            </div>
          ) : buildType === "railpack" ? (
            <FieldDescription>
              Railpack (Railway) juga mendeteksi stack dari isi repo, tetapi
              build-nya dijalankan BuildKit sehingga{" "}
              <strong>cache dependensi bertahan antar deploy</strong> (uji di
              sini: 284 s → 54 s). Butuh container BuildKit di host — dinyalakan
              otomatis saat build pertama; aplikasi di server remote tidak
              didukung. Build args diteruskan sebagai <code>--env</code>.
            </FieldDescription>
          ) : (
            <FieldDescription>
              Nixpacks mengenali Node, Python, Go, PHP, Ruby, Rust, dan lainnya
              dari isi repo. Build pertama lebih lama (image dasar ±430 MB +
              instalasi paket via Nix); cache build dinonaktifkan — pakai
              Railpack kalau ingin cache. Build args di bawah diteruskan sebagai
              env ke Nixpacks (mis. <code>NIXPACKS_NODE_VERSION=22</code>).
            </FieldDescription>
          )}
        </div>

        {(swarmActive || v.deployMode === "service") && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field>
              <FieldLabel htmlFor="app-deploy-mode">Mode deploy</FieldLabel>
              <Select
                name="deployMode"
                value={deployMode}
                onValueChange={(m) => setDeployMode(m as typeof deployMode)}
              >
                <SelectTrigger id="app-deploy-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="container">
                    Container (blue/green oleh aoox)
                  </SelectItem>
                  <SelectItem value="service">
                    Swarm service (replika, rolling update oleh daemon)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Service hanya di host aoox. Stop/start = skala ke 0 dan
                kembali; log & metrik dari task-nya. Ganti mode = deploy ulang
                image terakhir. Replika &gt; 1 berbagi mount volume yang sama.
              </FieldDescription>
            </Field>
            <Field data-invalid={invalid("replicas")}>
              <FieldLabel htmlFor="app-replicas">Replika</FieldLabel>
              <Input
                id="app-replicas"
                name="replicas"
                type="number"
                min={1}
                max={20}
                defaultValue={v.replicas}
                disabled={deployMode !== "service"}
                className="w-24"
              />
              <FieldError errors={errs("replicas")} />
            </Field>
            {deployMode === "service" && (
              <>
                <Field
                  className="sm:col-span-2"
                  data-invalid={invalid("swarmConstraint")}
                >
                  <FieldLabel htmlFor="app-swarm-constraint">
                    Constraint tambahan
                  </FieldLabel>
                  <Input
                    id="app-swarm-constraint"
                    name="swarmConstraint"
                    defaultValue={v.swarmConstraint}
                    placeholder="node.labels.zone==eu · node.role==worker · node.hostname!=web-1"
                    className="font-mono"
                  />
                  <FieldDescription>
                    Label node diatur di Settings → Docker Swarm. Digabung
                    dengan penempatan di bawah (semua harus terpenuhi).
                  </FieldDescription>
                  <FieldError errors={errs("swarmConstraint")} />
                </Field>
                <Field data-invalid={invalid("updateParallelism")}>
                  <FieldLabel htmlFor="app-upd-par">Rolling update</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Input
                      id="app-upd-par"
                      name="updateParallelism"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={v.updateParallelism}
                      className="w-20"
                      aria-label="Task per batch"
                    />
                    task/batch, jeda
                    <Input
                      name="updateDelaySeconds"
                      type="number"
                      min={0}
                      max={600}
                      defaultValue={v.updateDelaySeconds}
                      className="w-20"
                      aria-label="Jeda antar batch (detik)"
                    />
                    detik
                  </div>
                  <FieldError errors={errs("updateParallelism")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="app-upd-order">Urutan</FieldLabel>
                  <Select name="updateOrder" defaultValue={v.updateOrder}>
                    <SelectTrigger id="app-upd-order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Otomatis (start-first; stop-first bila ada port host)
                      </SelectItem>
                      <SelectItem value="start-first">
                        start-first (task baru dulu)
                      </SelectItem>
                      <SelectItem value="stop-first">
                        stop-first (hentikan yang lama dulu)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            {deployMode === "service" && swarmNodes.length > 1 && (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="app-swarm-node">Penempatan</FieldLabel>
                <Select
                  name="swarmNodeId"
                  defaultValue={v.swarmNodeId || "any"}
                >
                  <SelectTrigger id="app-swarm-node">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">
                      Node mana saja (otomatis)
                    </SelectItem>
                    {swarmNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.hostname} · {n.role}
                        {n.state !== "ready" && ` · ${n.state}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Aplikasi dengan mount selalu ditempatkan di host aoox
                  (volume-nya di sana). Task di node lain: log tetap tampil,
                  tetapi exec job & metrik hanya untuk task di host.
                </FieldDescription>
              </Field>
            )}
          </div>
        )}

        {servers.length > 0 && (
          <Field>
            <FieldLabel htmlFor="app-server">Server</FieldLabel>
            <Select name="serverId" defaultValue={v.serverId || "local"}>
              <SelectTrigger id="app-server">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Host aoox</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.username}@{s.host}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Di server remote: build dan container berjalan di Docker server
              itu (lewat SSH) dan image tidak di-push ke registry. Domain
              dilayani proxy server itu sendiri (Infrastruktur → Server remote →
              Proxy).
            </FieldDescription>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="app-cred">Kredensial Git</FieldLabel>
          <Select
            name="gitCredentialId"
            defaultValue={v.gitCredentialId || "none"}
          >
            <SelectTrigger id="app-cred">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada (repo publik)</SelectItem>
              {credentials.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Untuk repo privat; tambahkan kredensial di Settings.
          </FieldDescription>
        </Field>

        <div
          className={
            mode === "create" ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"
          }
        >
          <Field data-invalid={invalid("containerPort")}>
            <FieldLabel htmlFor="app-cport">Port container</FieldLabel>
            <Input
              id="app-cport"
              name="containerPort"
              type="number"
              min={1}
              max={65535}
              defaultValue={v.containerPort}
            />
            <FieldError errors={errs("containerPort")} />
          </Field>
          {mode === "edit" && (
            <Field data-invalid={invalid("hostPort") || portConflict || undefined}>
              <FieldLabel htmlFor="app-hport">Port host</FieldLabel>
              <Input
                id="app-hport"
                name="hostPort"
                type="number"
                min={1}
                max={65535}
                placeholder="kosong = tidak dipublikasikan"
                defaultValue={v.hostPort}
              />
              <FieldError errors={errs("hostPort")} />
              {portConflict && (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}
            </Field>
          )}
        </div>

        {mode === "create" && (
          <Field
            data-invalid={
              akses === "port"
                ? invalid("hostPort") || portConflict || undefined
                : undefined
            }
          >
            <FieldLabel>Akses</FieldLabel>
            <FieldDescription>
              Tanpa port host atau domain, aplikasi berjalan tapi tidak bisa
              dibuka dari luar — ini bisa diatur nanti juga di tab Pengaturan
              atau Domain.
            </FieldDescription>
            <Tabs
              value={akses}
              onValueChange={(next) => setAkses(next as Akses)}
            >
              <TabsList>
                <TabsTrigger value="port">IP &amp; port</TabsTrigger>
                <TabsTrigger value="domain">Domain</TabsTrigger>
                <TabsTrigger value="later">Nanti saja</TabsTrigger>
              </TabsList>
            </Tabs>
            {akses === "port" && (
              <div className="space-y-1">
                <FieldLabel htmlFor="app-hport">Port host</FieldLabel>
                <Input
                  id="app-hport"
                  name="hostPort"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="mis. 8080"
                  defaultValue={v.hostPort}
                />
                <FieldDescription>
                  Dibuka langsung lewat IP:{" "}
                  <code>
                    http://{browserHost ?? "<ip-server>"}:&lt;port&gt;
                  </code>
                  , tanpa domain/proxy.
                </FieldDescription>
                <FieldError errors={errs("hostPort")} />
                {portConflict && (
                  <p className="text-sm text-destructive" role="alert">
                    {state.error}
                  </p>
                )}
              </div>
            )}
            {akses === "domain" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-64 flex-1 space-y-1">
                    <FieldLabel htmlFor="app-domain-host">Hostname</FieldLabel>
                    <Input
                      id="app-domain-host"
                      value={domainHost}
                      onChange={(e) => setDomainHost(e.target.value)}
                      placeholder="app.example.com"
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-1.5 text-sm">
                    <Switch
                      checked={domainHttps}
                      onCheckedChange={setDomainHttps}
                      disabled={!proxy?.acmeEmail}
                    />
                    HTTPS
                  </label>
                </div>
                <FieldDescription>
                  Dibuka lewat reverse proxy (arahkan DNS host ini ke server
                  ini).
                  {proxy && !proxy.running &&
                    " Proxy belum berjalan — akan diaktifkan otomatis kalau perlu."}
                  {proxy && !proxy.acmeEmail &&
                    " HTTPS memerlukan PROXY_ACME_EMAIL di API."}
                </FieldDescription>
                {domainError && (
                  <p className="text-sm text-destructive" role="alert">
                    {domainError}
                  </p>
                )}
              </div>
            )}
            {akses === "later" && (
              <FieldDescription>
                Aplikasi dibuat tanpa alamat akses — atur port host atau
                domain belakangan.
              </FieldDescription>
            )}
          </Field>
        )}

        <Field data-invalid={invalid("healthcheckPath")}>
          <FieldLabel htmlFor="app-health">Health check path</FieldLabel>
          <Input
            id="app-health"
            name="healthcheckPath"
            placeholder="/health (kosong = tanpa health check)"
            defaultValue={v.healthcheckPath}
          />
          <FieldDescription>
            Deploy menunggu path ini menjawab 2xx/3xx di dalam container (butuh
            wget/curl/node/python3 di image). Untuk app yang dirutekan lewat
            domain tanpa port host, container baru dinaikkan di samping yang
            lama dan baru menggantikannya setelah sehat — tanpa downtime. Gagal
            sehat = deploy gagal, container lama tetap jalan.
          </FieldDescription>
          <FieldError errors={errs("healthcheckPath")} />
        </Field>

        {mode === "edit" && (
          <Field>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                name="ignoreErrorLogs"
                defaultChecked={v.ignoreErrorLogs === "on"}
              />
              Abaikan error di log
            </label>
            <FieldDescription>
              Lewati aplikasi ini dari pemindaian log otomatis (notifikasi{" "}
              <em>Error aplikasi</em>) — untuk aplikasi yang output normalnya
              memang terlihat seperti error.
            </FieldDescription>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid("cpuMillicores")}>
            <FieldLabel htmlFor="app-cpu">Batas CPU (millicore)</FieldLabel>
            <Input
              id="app-cpu"
              name="cpuMillicores"
              type="number"
              min={100}
              max={64000}
              step={100}
              placeholder="kosong = tanpa batas; 1000 = 1 core"
              defaultValue={v.cpuMillicores}
            />
            <FieldError errors={errs("cpuMillicores")} />
          </Field>
          <Field data-invalid={invalid("memoryMb")}>
            <FieldLabel htmlFor="app-mem">Batas memori (MiB)</FieldLabel>
            <Input
              id="app-mem"
              name="memoryMb"
              type="number"
              min={64}
              max={1048576}
              step={64}
              placeholder="kosong = tanpa batas"
              defaultValue={v.memoryMb}
            />
            <FieldDescription>
              Berlaku langsung ke container yang sedang jalan (mencabut batas =
              container dibuat ulang).
            </FieldDescription>
            <FieldError errors={errs("memoryMb")} />
          </Field>
          <Field data-invalid={invalid("deploymentKeep")}>
            <FieldLabel htmlFor="app-keep">Riwayat deployment</FieldLabel>
            <Input
              id="app-keep"
              name="deploymentKeep"
              type="number"
              min={1}
              max={100}
              defaultValue={v.deploymentKeep}
            />
            <FieldDescription>
              Jumlah deployment sukses (beserta image-nya) yang disimpan untuk
              rollback; lebih lama dihapus saat pembersihan malam.
            </FieldDescription>
            <FieldError errors={errs("deploymentKeep")} />
          </Field>
        </div>

        <Field data-invalid={invalid("env")}>
          <FieldLabel>Environment variables</FieldLabel>
          <EnvEditor name="env" defaultValue={v.env} />
          <FieldDescription>
            Berlaku pada deploy berikutnya, di atas env bersama project. Nilai
            bisa merujuk <code>{"${{project.KEY}}"}</code>
            {databaseSlugs && databaseSlugs.length > 0 ? (
              <>
                {" "}
                dan database project ini:{" "}
                {databaseSlugs.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ", "}
                    <code>{`\${{database.${s}.url}}`}</code>
                  </span>
                ))}{" "}
                (juga <code>.host</code>, <code>.port</code>,{" "}
                <code>.username</code>, <code>.password</code>,{" "}
                <code>.database</code>).
              </>
            ) : (
              <>
                {" "}
                dan <code>{"${{database.<slug>.url}}"}</code>.
              </>
            )}
          </FieldDescription>
          <FieldError errors={errs("env")} />
        </Field>

        <Field data-invalid={invalid("previewDomain")}>
          <FieldLabel>Preview pull request</FieldLabel>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              name="previewsEnabled"
              defaultChecked={v.previewsEnabled === "on"}
            />
            Build & jalankan setiap PR yang dibuka (via webhook)
          </label>
          <Input
            name="previewDomain"
            placeholder="preview.example.com (opsional; default PREVIEW_DOMAIN API)"
            defaultValue={v.previewDomain}
            className="mt-2"
            aria-label="Domain preview"
          />
          <FieldDescription>
            Preview dapat diakses di{" "}
            <code>{"<app>-pr<N>.<domain preview>"}</code> (butuh DNS wildcard ke
            host ini). PR dari fork selalu diabaikan — branch PR adalah kode
            arbitrer. Maks 5 preview terbuka per aplikasi. Aktifkan event{" "}
            <em>Pull requests</em> di webhook provider.
          </FieldDescription>
          <FieldError errors={errs("previewDomain")} />
        </Field>

        <Field data-invalid={invalid("buildArgs")}>
          <FieldLabel htmlFor="app-build-args">Build args</FieldLabel>
          <Textarea
            id="app-build-args"
            name="buildArgs"
            rows={3}
            placeholder="NODE_VERSION=22"
            defaultValue={v.buildArgs}
            className="font-mono text-xs"
          />
          <FieldDescription>
            Satu <code>KEY=VALUE</code> per baris, diteruskan ke{" "}
            <code>ARG</code> di Dockerfile saat build. Ikut tersimpan di image —
            jangan untuk rahasia; tidak mendukung referensi.
          </FieldDescription>
          <FieldError errors={errs("buildArgs")} />
        </Field>

        {state.error && !portConflict && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        {state.saved && !state.error && (
          <FieldDescription>Tersimpan.</FieldDescription>
        )}

        <div className="flex justify-end gap-2">
          {cancelHref && (
            <Button asChild variant="outline">
              <Link href={cancelHref}>Batal</Link>
            </Button>
          )}
          <Button
            type="submit"
            disabled={domainMode ? domainPending : pending}
          >
            {(domainMode ? domainPending : pending) && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {(domainMode ? domainPending : pending)
              ? mode === "create"
                ? "Membuat…"
                : "Menyimpan…"
              : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
