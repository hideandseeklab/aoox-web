"use client"

import { HostPortBindField } from "@/components/custom/host-port-bind-field"
import { normalizeBind } from "@/lib/host-port-bind"
import { PathArrow } from "@/components/custom/arrows"
import { Check, Container, GitBranch, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "@/lib/use-router"
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Tabs } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { Network, Globe, Clock } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { EnvEditor } from "@/components/custom/env-editor"
import { VariableSetLinksEditor } from "@/components/custom/variable-set-links"
import type { ProjectVariableSet } from "@/features/variable-set/variable-set.entity"
import { ExposedPortAlert } from "@/components/custom/exposed-port-alert"
import { EnvRefsHint } from "@/components/custom/application-environment"
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

type Access = "port" | "domain" | "later"

const SOURCE_OPTIONS = [
  { value: "git", icon: GitBranch },
  { value: "image", icon: Container },
] as const

type Values = NonNullable<ApplicationFormState["values"]>

const EMPTY: Values = {
  name: "",
  gitUrl: "",
  gitBranch: "main",
  dockerfilePath: "Dockerfile",
  rootDirectory: "",
  watchRootOnly: "",
  gitCredentialId: "",
  containerPort: "3000",
  hostPort: "",
  hostPortBind: "public",
  healthcheckPath: "",
  cpuMillicores: "",
  memoryMb: "",
  deploymentKeep: "10",
  env: "",
  variableSetLinks: "",
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
  variableSets = [],
  canLinkProtected = true,
  registries = [],
  swarmActive = false,
  swarmNodes = [],
  proxy,
  onCreateWithDomain,
  onPendingChange,
  hostPortApply,
  cancelHref,
  readOnly = false,
  buildArgsHidden = false,
  exposedPortAlert,
}: {
  action: (
    prev: ApplicationFormState,
    formData: FormData
  ) => Promise<ApplicationFormState>
  /** Create mode adds the "Access" step (host port / domain / later). */
  mode?: "create" | "edit"
  defaultValues?: Partial<Values>
  submitLabel: string
  /** Project viewers: show every value but disable all fields and hide Save. */
  readOnly?: boolean
  /** Viewers: build args are not sent to them; show a note instead of the field. */
  buildArgsHidden?: boolean
  /** Edit mode: warns when the image's EXPOSE ports exclude the saved Container port. */
  exposedPortAlert?: {
    applicationId: string
    containerPort: number
    exposedPorts: number[] | null | undefined
    canEdit: boolean
  }
  credentials: GitCredential[]
  /** Managed database slugs in this project, for the reference hint. */
  databaseSlugs?: string[]
  /** Registries whose credentials can pull a private image (Registry page). */
  registries?: Registry[]
  /** Remote servers (Settings); empty = only the aoox host. */
  servers?: Server[]
  /** Create mode: variable sets shared with the project, for the optional link picker. */
  variableSets?: ProjectVariableSet[]
  /** Project admins only may link a protected environment. */
  canLinkProtected?: boolean
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
  /**
   * Edit mode: how a changed Port host reaches the app — `recreate` (running
   * container is recreated now, brief downtime), `rolling` (swarm service,
   * queued as a config deployment), `on-start` (stopped: applied on the next
   * start) or `next-deploy` (never deployed).
   */
  hostPortApply?: "recreate" | "rolling" | "on-start" | "next-deploy"
  /** Create mode only: lets the dialog lock its close/cancel button while a submission is in flight. */
  onPendingChange?: (pending: boolean) => void
  /** Standalone create page only: renders a "Cancel" link back to the project. */
  cancelHref?: string
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const code = (chunks: React.ReactNode) => <code>{chunks}</code>
  const initial = { ...EMPTY, ...defaultValues }
  const [state, formAction, pending] = useActionState(action, {
    values: initial,
  })
  const router = useRouter()
  const toastIdRef = useRef<string | number | undefined>(undefined)
  const wasPendingRef = useRef(false)
  const editToastRef = useRef<{ id: string | number; message: string } | null>(
    null
  )
  const v = state.values ?? initial
  const [buildType, setBuildType] = useState(v.buildType)
  // Create mode pre-fills the port per build type (nginx serves static sites on 80);
  // once the user types a port themselves it is never overwritten.
  const [containerPort, setContainerPort] = useState(v.containerPort)
  const portTouched = useRef(false)
  const [sourceType, setSourceType] = useState(v.sourceType)
  const [deployMode, setDeployMode] = useState(v.deployMode)
  const [hostBind, setHostBind] = useState(normalizeBind(v.hostPortBind))
  const [imageRef, setImageRef] = useState(v.imageRef)
  const [imageRegistryId, setImageRegistryId] = useState(
    v.imageRegistryId || "public"
  )
  const [access, setAccess] = useState<Access>(v.hostPort ? "port" : "later")
  const [domainHost, setDomainHost] = useState("")
  const [domainHttps, setDomainHttps] = useState(false)
  const [domainPending, setDomainPending] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)
  // The "Domain" create path submits outside the form action, so its field
  // errors are kept here and shown under the same fields as the action's.
  const [domainFieldErrors, setDomainFieldErrors] =
    useState<ApplicationFormState["fieldErrors"]>(undefined)
  const browserHost = useBrowserHost()
  const domainMode = mode === "create" && access === "domain"
  const fieldErrors = domainMode ? domainFieldErrors : state.fieldErrors
  const errs = (k: keyof Values) =>
    fieldErrors?.[k]?.map((message) => ({ message }))
  const invalid = (k: keyof Values) => !!fieldErrors?.[k] || undefined
  // The API doesn't (yet) shape port-conflict errors as a field error, so a
  // generic create/update failure that mentions "port" is shown next to the
  // host port input instead of the generic banner at the bottom.
  const portConflict =
    !!state.error &&
    /port/i.test(state.error) &&
    (mode === "edit" || access === "port")

  // Plain create (IP+port / later): the action no longer redirects itself
  // (a server `redirect()` would abort before this toast could be resolved,
  // per the "Domain" option's comment above), so navigation happens here
  // once the row exists — the app keeps provisioning in the background.
  useEffect(() => {
    if (mode !== "create" || domainMode) return
    if (wasPendingRef.current && !pending) {
      if (state.createdId) {
        toast.success(
          t("form.toast.created", { name: state.values?.name ?? "" }),
          { id: toastIdRef.current }
        )
        router.push(`/applications/${state.createdId}`)
      } else if (state.error || state.fieldErrors) {
        toast.error(state.error ?? t("form.toast.checkFields"), {
          id: toastIdRef.current,
        })
      }
    }
    wasPendingRef.current = pending
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a pending->settled transition
  }, [pending])

  // Edit mode: one toast per save (loading → success/error, same id). A
  // changed Port host says what actually happened to the running app.
  useEffect(() => {
    if (mode !== "edit") return
    const pendingToast = editToastRef.current
    if (pendingToast && !pending) {
      if (state.error || state.fieldErrors) {
        toast.error(state.error ?? t("form.toast.checkFields"), {
          id: pendingToast.id,
        })
      } else if (state.saved) {
        toast.success(pendingToast.message, { id: pendingToast.id })
      } else {
        toast.dismiss(pendingToast.id)
      }
      editToastRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a pending->settled transition
  }, [pending])

  useEffect(() => {
    onPendingChange?.(domainMode ? domainPending : pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, domainPending, domainMode])

  const creatingMessage = (formData: FormData) => {
    const name = String(formData.get("name") || "").trim()
    return name
      ? t("form.toast.creatingNamed", { name })
      : t("form.toast.creatingUnnamed")
  }

  const submitCreate = (e: FormEvent<HTMLFormElement>) => {
    if (mode !== "create" || domainMode) return
    const formData = new FormData(e.currentTarget)
    toastIdRef.current = toast.loading(creatingMessage(formData))
  }

  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    if (mode !== "edit") return
    const next = String(
      new FormData(e.currentTarget).get("hostPort") ?? ""
    ).trim()
    const nextBind = String(
      new FormData(e.currentTarget).get("hostPortBind") ?? "public"
    )
    // A new bind address is applied exactly like a new host port, but only while a port is published.
    const changed =
      next !== (defaultValues?.hostPort ?? "") ||
      (next !== "" && nextBind !== (defaultValues?.hostPortBind ?? "public"))
    const message =
      !changed || hostPortApply === "next-deploy" || !hostPortApply
        ? t("form.toast.saved")
        : hostPortApply === "recreate"
          ? next
            ? t("form.toast.hostPortSetRecreated")
            : t("form.toast.hostPortRemovedRecreated")
          : hostPortApply === "rolling"
            ? t("form.toast.hostPortRolling")
            : t("form.toast.hostPortOnStart")
    editToastRef.current = {
      id: toast.loading(
        changed && hostPortApply === "recreate"
          ? t("form.toast.applyingHostPort")
          : tc("states.saving")
      ),
      message,
    }
  }

  const submitDomain = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onCreateWithDomain) return
    if (!domainHost.trim()) {
      setDomainError(t("form.access.hostRequired"))
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set("hostPort", "")
    formData.set("domainHost", domainHost.trim())
    formData.set("domainHttps", domainHttps ? "on" : "")
    setDomainError(null)
    setDomainFieldErrors(undefined)
    setDomainPending(true)
    const toastId = toast.loading(creatingMessage(formData))
    onCreateWithDomain(formData, toastId).then((r) => {
      setDomainPending(false)
      if (r.ok) return
      if (r.fieldErrors) setDomainFieldErrors(r.fieldErrors)
      else setDomainError(r.error)
    })
  }

  return (
    <form
      action={domainMode ? undefined : formAction}
      onSubmit={
        domainMode ? submitDomain : mode === "edit" ? submitEdit : submitCreate
      }
      noValidate
    >
      <fieldset disabled={readOnly} className="contents">
      <FieldGroup className="@container">
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="app-name">{tc("labels.name")}</FieldLabel>
          <Input id="app-name" name="name" defaultValue={v.name} required />
          <FieldError errors={errs("name")} />
        </Field>

        <div className="grid gap-4 @3xl:grid-cols-2 @3xl:items-start">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("form.source.title")}</CardTitle>
                <CardDescription>
                  {t("form.source.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">{t("form.source.legend")}</legend>
                  {SOURCE_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className="group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50"
                    >
                      <input
                        type="radio"
                        name="sourceType"
                        value={o.value}
                        checked={sourceType === o.value}
                        onChange={() => setSourceType(o.value)}
                        className="sr-only"
                      />
                      <o.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-has-[:checked]:text-primary" />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium">
                          {t(`form.source.options.${o.value}.title`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`form.source.options.${o.value}.description`)}
                        </span>
                      </span>
                      <Check className="ms-auto size-4 shrink-0 text-primary opacity-0 group-has-[:checked]:opacity-100" />
                    </label>
                  ))}
                </fieldset>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {sourceType === "image"
                    ? t("form.image.title")
                    : t("form.git.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {sourceType === "image" && (
                    // One column: image + picker, then credentials under them, then auto-update.
                    <div className="grid gap-4">
                      <Field data-invalid={invalid("imageRef")}>
                        <FieldLabel htmlFor="app-image">
                          {t("form.image.label")}
                        </FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            id="app-image"
                            name="imageRef"
                            placeholder={t("form.image.placeholder")}
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
                          {t.rich("form.image.description", { code })}
                        </FieldDescription>
                        <FieldError errors={errs("imageRef")} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="app-image-registry">
                          {t("form.image.credentials")}
                        </FieldLabel>
                        <Select
                          name="imageRegistryId"
                          value={imageRegistryId}
                          onValueChange={setImageRegistryId}
                        >
                          <SelectTrigger
                            id="app-image-registry"
                            className="w-full sm:w-72"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="public">
                              {t("form.image.public")}
                            </SelectItem>
                            {registries.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} · {r.url}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field data-invalid={invalid("autoUpdateIntervalMinutes")}>
                        <FieldLabel>{t("form.image.autoUpdate")}</FieldLabel>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <label className="flex items-center gap-2">
                            <Switch
                              name="autoUpdate"
                              defaultChecked={v.autoUpdate === "on"}
                            />
                            {t("form.image.autoUpdateSwitch")}
                          </label>
                          <span className="flex items-center gap-2">
                            {t.rich("form.image.checkEvery", {
                              input: () => (
                                <Input
                                  name="autoUpdateIntervalMinutes"
                                  type="number"
                                  min={5}
                                  max={1440}
                                  defaultValue={v.autoUpdateIntervalMinutes}
                                  className="w-20"
                                  aria-label={t("form.image.intervalAria")}
                                />
                              ),
                            })}
                          </span>
                        </div>
                        <FieldDescription>
                          {t.rich("form.image.autoUpdateHelp", { code })}
                        </FieldDescription>
                        <FieldError
                          errors={errs("autoUpdateIntervalMinutes")}
                        />
                      </Field>
                    </div>
                  )}

                  <div
                    className={sourceType === "image" ? "hidden" : "contents"}
                  >
                    <Field data-invalid={invalid("gitUrl")}>
                      <FieldLabel htmlFor="app-git">
                        {t("form.git.label")}
                      </FieldLabel>
                      <Input
                        id="app-git"
                        name="gitUrl"
                        placeholder="https://github.com/org/repo.git"
                        defaultValue={v.gitUrl}
                        required={sourceType === "git"}
                      />
                      <FieldDescription>
                        {t("form.git.description")}
                      </FieldDescription>
                      <FieldError errors={errs("gitUrl")} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field data-invalid={invalid("gitBranch")}>
                        <FieldLabel htmlFor="app-branch">
                          {t("form.git.branch")}
                        </FieldLabel>
                        <Input
                          id="app-branch"
                          name="gitBranch"
                          defaultValue={v.gitBranch}
                        />
                        <FieldError errors={errs("gitBranch")} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="app-build-type">
                          {t("form.git.buildType")}
                        </FieldLabel>
                        <Select
                          name="buildType"
                          value={buildType}
                          onValueChange={(bt) => {
                            setBuildType(bt as typeof buildType)
                            if (mode === "create" && !portTouched.current) {
                              setContainerPort(bt === "static" ? "80" : "3000")
                            }
                          }}
                        >
                          <SelectTrigger id="app-build-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="dockerfile">
                              {t("form.git.buildTypes.dockerfile")}
                            </SelectItem>
                            <SelectItem value="nixpacks">
                              {t("form.git.buildTypes.nixpacks")}
                            </SelectItem>
                            <SelectItem value="railpack">
                              {t("form.git.buildTypes.railpack")}
                            </SelectItem>
                            <SelectItem value="static">
                              {t("form.git.buildTypes.static")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field data-invalid={invalid("rootDirectory")}>
                      <FieldLabel htmlFor="app-root-dir">
                        {t("form.git.rootDirectory")}
                      </FieldLabel>
                      <Input
                        id="app-root-dir"
                        name="rootDirectory"
                        placeholder={t("form.git.rootDirectoryPlaceholder")}
                        defaultValue={v.rootDirectory}
                        className="font-mono"
                      />
                      <FieldDescription>
                        {t.rich("form.git.rootDirectoryHelp", { code })}
                      </FieldDescription>
                      <FieldError errors={errs("rootDirectory")} />
                      <label className="mt-2 flex items-center gap-2 text-xs">
                        <Switch
                          name="watchRootOnly"
                          defaultChecked={v.watchRootOnly === "on"}
                          aria-label={t("form.git.watchRootAria")}
                        />
                        {t("form.git.watchRoot")}
                      </label>
                    </Field>
                    {buildType === "dockerfile" ? (
                      <Field data-invalid={invalid("dockerfilePath")}>
                        <FieldLabel htmlFor="app-dockerfile">
                          Dockerfile
                        </FieldLabel>
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
                            {t("form.static.buildCommand")}
                          </FieldLabel>
                          <Input
                            id="app-static-build"
                            name="staticBuildCommand"
                            placeholder={t(
                              "form.static.buildCommandPlaceholder"
                            )}
                            defaultValue={v.staticBuildCommand}
                            className="font-mono"
                          />
                          <FieldDescription>
                            {t.rich("form.static.buildCommandHelp", { code })}
                          </FieldDescription>
                          <FieldError errors={errs("staticBuildCommand")} />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field data-invalid={invalid("staticOutputDir")}>
                            <FieldLabel htmlFor="app-static-out">
                              {t("form.static.outputDir")}
                            </FieldLabel>
                            <Input
                              id="app-static-out"
                              name="staticOutputDir"
                              placeholder="dist"
                              defaultValue={v.staticOutputDir}
                              className="font-mono"
                            />
                            <FieldDescription>
                              {t.rich("form.static.outputDirHelp", { code })}
                            </FieldDescription>
                            <FieldError errors={errs("staticOutputDir")} />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="app-static-spa">
                              {t("form.static.spaMode")}
                            </FieldLabel>
                            <label className="flex items-center gap-2 text-xs">
                              <Switch
                                id="app-static-spa"
                                name="staticSpa"
                                defaultChecked={v.staticSpa === "on"}
                              />
                              <span>
                                {t.rich("form.static.spaSwitch", { code })}
                              </span>
                            </label>
                            <FieldDescription>
                              {t("form.static.spaHelp")}
                            </FieldDescription>
                          </Field>
                        </div>
                      </div>
                    ) : buildType === "railpack" ? (
                      <FieldDescription>
                        {t.rich("form.git.railpackHelp", {
                          code,
                          strong: (chunks) => <strong>{chunks}</strong>,
                          arrow: () => <PathArrow />,
                        })}
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        {t.rich("form.git.nixpacksHelp", { code })}
                      </FieldDescription>
                    )}
                    <Field>
                      <FieldLabel htmlFor="app-cred">
                        {t("form.git.credential")}
                      </FieldLabel>
                      <Select
                        name="gitCredentialId"
                        defaultValue={v.gitCredentialId || "none"}
                      >
                        <SelectTrigger id="app-cred">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="none">
                            {t("form.git.credentialNone")}
                          </SelectItem>
                          {credentials.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} · {c.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {t("form.git.credentialHelp")}
                      </FieldDescription>
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("form.network.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {mode === "edit" && exposedPortAlert && (
                    <ExposedPortAlert
                      {...exposedPortAlert}
                      onApplied={(port) => setContainerPort(String(port))}
                    />
                  )}
                  <div
                    className={
                      mode === "create"
                        ? "grid gap-4"
                        : "grid gap-4 sm:grid-cols-2"
                    }
                  >
                    <Field data-invalid={invalid("containerPort")}>
                      <FieldLabel htmlFor="app-cport">
                        {t("form.network.containerPort")}
                      </FieldLabel>
                      <Input
                        id="app-cport"
                        name="containerPort"
                        type="number"
                        min={1}
                        max={65535}
                        value={containerPort}
                        onChange={(e) => {
                          portTouched.current = true
                          setContainerPort(e.target.value)
                        }}
                      />
                      {buildType === "static" &&
                        (mode === "create" || containerPort !== "80") && (
                          <FieldDescription>
                            {t("form.network.staticNote")}
                          </FieldDescription>
                        )}
                      <FieldError errors={errs("containerPort")} />
                    </Field>
                    {mode === "edit" && (
                      <Field
                        data-invalid={
                          invalid("hostPort") || portConflict || undefined
                        }
                      >
                        <FieldLabel htmlFor="app-hport">
                          {t("form.network.hostPort")}
                        </FieldLabel>
                        <Input
                          id="app-hport"
                          name="hostPort"
                          type="number"
                          min={1}
                          max={65535}
                          placeholder={t("form.network.hostPortPlaceholder")}
                          defaultValue={v.hostPort}
                        />
                        <FieldDescription>
                          {hostPortApply === "recreate"
                            ? t("form.network.applyRecreate")
                            : hostPortApply === "rolling"
                              ? t("form.network.applyRolling")
                              : hostPortApply === "on-start"
                                ? t("form.network.applyOnStart")
                                : t("form.network.applyNextDeploy")}
                        </FieldDescription>
                        <FieldError errors={errs("hostPort")} />
                        {portConflict && (
                          <p className="text-xs text-destructive" role="alert">
                            {state.error}
                          </p>
                        )}
                      </Field>
                    )}
                    {mode === "edit" && (
                      <Field>
                        <HostPortBindField
                          id="app-hport-bind"
                          name="hostPortBind"
                          value={deployMode === "service" ? "public" : hostBind}
                          onValueChange={setHostBind}
                          disableLoopback={deployMode === "service"}
                        />
                      </Field>
                    )}
                  </div>

                  {mode === "create" && (
                    <Field
                      data-invalid={
                        access === "port"
                          ? invalid("hostPort") || portConflict || undefined
                          : undefined
                      }
                    >
                      <FieldLabel>{t("form.access.label")}</FieldLabel>
                      <FieldDescription>
                        {t("form.access.description")}
                      </FieldDescription>
                      <Tabs
                        value={access}
                        onValueChange={(next) => setAccess(next as Access)}
                      >
                        <ScrollableTabsList>
                          <PageTabsTrigger
                            icon={Network}
                            value="port"
                            className="py-1.5"
                          >
                            {t("form.access.tabPort")}
                          </PageTabsTrigger>
                          <PageTabsTrigger
                            icon={Globe}
                            value="domain"
                            className="py-1.5"
                          >
                            {t("form.access.tabDomain")}
                          </PageTabsTrigger>
                          <PageTabsTrigger
                            icon={Clock}
                            value="later"
                            className="py-1.5"
                          >
                            {t("form.access.tabLater")}
                          </PageTabsTrigger>
                        </ScrollableTabsList>
                      </Tabs>
                      {access === "port" && (
                        <div className="space-y-1">
                          <FieldLabel htmlFor="app-hport">
                            {t("form.network.hostPort")}
                          </FieldLabel>
                          <Input
                            id="app-hport"
                            name="hostPort"
                            type="number"
                            min={1}
                            max={65535}
                            placeholder={t("form.access.hostPortPlaceholder")}
                            defaultValue={v.hostPort}
                          />
                          <FieldDescription>
                            {t.rich("form.access.hostPortHelp", {
                              code,
                              url: `http://${browserHost ?? t("form.access.ipPlaceholder")}:<port>`,
                            })}
                          </FieldDescription>
                          <FieldError errors={errs("hostPort")} />
                          {portConflict && (
                            <p
                              className="text-xs text-destructive"
                              role="alert"
                            >
                              {state.error}
                            </p>
                          )}
                          <HostPortBindField
                            id="app-hport-bind"
                            name="hostPortBind"
                            value={deployMode === "service" ? "public" : hostBind}
                            onValueChange={setHostBind}
                            disableLoopback={deployMode === "service"}
                          />
                        </div>
                      )}
                      {access === "domain" && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-64 flex-1 space-y-1">
                              <FieldLabel htmlFor="app-domain-host">
                                {t("form.access.hostname")}
                              </FieldLabel>
                              <Input
                                id="app-domain-host"
                                value={domainHost}
                                onChange={(e) => setDomainHost(e.target.value)}
                                placeholder="app.example.com"
                              />
                            </div>
                            <label className="flex items-center gap-2 pb-1.5 text-xs">
                              <Switch
                                checked={domainHttps}
                                onCheckedChange={setDomainHttps}
                                disabled={!proxy?.acmeEmail}
                              />
                              HTTPS
                            </label>
                          </div>
                          <FieldDescription>
                            {t("form.access.domainHelp")}
                            {proxy &&
                              !proxy.running &&
                              ` ${t("form.access.proxyNotRunning")}`}
                            {proxy &&
                              !proxy.acmeEmail &&
                              ` ${t("form.access.httpsNeedsAcme")}`}
                          </FieldDescription>
                          {domainError && (
                            <p
                              className="text-xs text-destructive"
                              role="alert"
                            >
                              {domainError}
                            </p>
                          )}
                        </div>
                      )}
                      {access === "later" && (
                        <FieldDescription>
                          {t("form.access.laterHelp")}
                        </FieldDescription>
                      )}
                    </Field>
                  )}

                  <Field data-invalid={invalid("healthcheckPath")}>
                    <FieldLabel htmlFor="app-health">
                      {t("form.network.healthcheck")}
                    </FieldLabel>
                    <Input
                      id="app-health"
                      name="healthcheckPath"
                      placeholder={t("form.network.healthcheckPlaceholder")}
                      defaultValue={v.healthcheckPath}
                    />
                    <FieldDescription>
                      {t("form.network.healthcheckHelp")}
                    </FieldDescription>
                    <FieldError errors={errs("healthcheckPath")} />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Edit mode keeps env in its own tab (application-environment.tsx), so there is
            a single source: this form no longer sends it. */}
            {mode === "create" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("environment.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={invalid("env")}>
                      <FieldLabel>{t("form.env.label")}</FieldLabel>
                      <EnvEditor
                        name="env"
                        defaultValue={v.env}
                        readOnly={readOnly}
                      />
                      <FieldDescription>
                        {t("form.env.description")}{" "}
                        <EnvRefsHint databaseSlugs={databaseSlugs} />
                      </FieldDescription>
                      <FieldError errors={errs("env")} />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            )}

            {/* Edit mode manages links in the Environment tab (variable-set-links.tsx). */}
            {mode === "create" && variableSets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("form.variableSets.title")}</CardTitle>
                  <CardDescription>
                    {t("form.variableSets.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VariableSetLinksEditor
                    mode="form"
                    namespace="application"
                    available={variableSets}
                    canLinkProtected={canLinkProtected}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("form.advanced.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {servers.length > 0 && (
                    <Field>
                      <FieldLabel htmlFor="app-server">
                        {tc("labels.server")}
                      </FieldLabel>
                      <Select
                        name="serverId"
                        defaultValue={v.serverId || "local"}
                      >
                        <SelectTrigger id="app-server">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="local">
                            {t("form.advanced.localHost")}
                          </SelectItem>
                          {servers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} · {s.username}@{s.host}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {t.rich("form.advanced.serverHelp", {
                          arrow: () => <PathArrow />,
                        })}
                      </FieldDescription>
                    </Field>
                  )}

                  {(swarmActive || v.deployMode === "service") && (
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                      <Field>
                        <FieldLabel htmlFor="app-deploy-mode">
                          {t("form.advanced.deployMode")}
                        </FieldLabel>
                        <Select
                          name="deployMode"
                          value={deployMode}
                          onValueChange={(m) =>
                            setDeployMode(m as typeof deployMode)
                          }
                        >
                          <SelectTrigger id="app-deploy-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="container">
                              {t("form.advanced.modeContainer")}
                            </SelectItem>
                            <SelectItem value="service">
                              {t("form.advanced.modeService")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          {t("form.advanced.deployModeHelp")}
                        </FieldDescription>
                      </Field>
                      <Field data-invalid={invalid("replicas")}>
                        <FieldLabel htmlFor="app-replicas">
                          {t("form.advanced.replicas")}
                        </FieldLabel>
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
                              {t("form.advanced.constraint")}
                            </FieldLabel>
                            <Input
                              id="app-swarm-constraint"
                              name="swarmConstraint"
                              defaultValue={v.swarmConstraint}
                              placeholder="node.labels.zone==eu · node.role==worker · node.hostname!=web-1"
                              className="font-mono"
                            />
                            <FieldDescription>
                              {t.rich("form.advanced.constraintHelp", {
                                arrow: () => <PathArrow />,
                              })}
                            </FieldDescription>
                            <FieldError errors={errs("swarmConstraint")} />
                          </Field>
                          <Field data-invalid={invalid("updateParallelism")}>
                            <FieldLabel htmlFor="app-upd-par">
                              {t("form.advanced.rollingUpdate")}
                            </FieldLabel>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {t.rich("form.advanced.rollingUpdateRow", {
                                parallelism: () => (
                                  <Input
                                    id="app-upd-par"
                                    name="updateParallelism"
                                    type="number"
                                    min={1}
                                    max={20}
                                    defaultValue={v.updateParallelism}
                                    className="w-20"
                                    aria-label={t(
                                      "form.advanced.parallelismAria"
                                    )}
                                  />
                                ),
                                delay: () => (
                                  <Input
                                    name="updateDelaySeconds"
                                    type="number"
                                    min={0}
                                    max={600}
                                    defaultValue={v.updateDelaySeconds}
                                    className="w-20"
                                    aria-label={t("form.advanced.delayAria")}
                                  />
                                ),
                              })}
                            </div>
                            <FieldError errors={errs("updateParallelism")} />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="app-upd-order">
                              {t("form.advanced.order")}
                            </FieldLabel>
                            <Select
                              name="updateOrder"
                              defaultValue={v.updateOrder}
                            >
                              <SelectTrigger id="app-upd-order">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper">
                                <SelectItem value="auto">
                                  {t("form.advanced.orderAuto")}
                                </SelectItem>
                                <SelectItem value="start-first">
                                  {t("form.advanced.orderStartFirst")}
                                </SelectItem>
                                <SelectItem value="stop-first">
                                  {t("form.advanced.orderStopFirst")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </>
                      )}
                      {deployMode === "service" && swarmNodes.length > 1 && (
                        <Field className="sm:col-span-2">
                          <FieldLabel htmlFor="app-swarm-node">
                            {t("form.advanced.placement")}
                          </FieldLabel>
                          <Select
                            name="swarmNodeId"
                            defaultValue={v.swarmNodeId || "any"}
                          >
                            <SelectTrigger id="app-swarm-node">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="any">
                                {t("form.advanced.placementAny")}
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
                            {t("form.advanced.placementHelp")}
                          </FieldDescription>
                        </Field>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={invalid("cpuMillicores")}>
                      <FieldLabel htmlFor="app-cpu">
                        {t("form.advanced.cpuLimit")}
                      </FieldLabel>
                      <Input
                        id="app-cpu"
                        name="cpuMillicores"
                        type="number"
                        min={100}
                        max={64000}
                        step={100}
                        placeholder={t("form.advanced.cpuPlaceholder")}
                        defaultValue={v.cpuMillicores}
                      />
                      <FieldError errors={errs("cpuMillicores")} />
                    </Field>
                    <Field data-invalid={invalid("memoryMb")}>
                      <FieldLabel htmlFor="app-mem">
                        {t("form.advanced.memoryLimit")}
                      </FieldLabel>
                      <Input
                        id="app-mem"
                        name="memoryMb"
                        type="number"
                        min={64}
                        max={1048576}
                        step={64}
                        placeholder={t("form.advanced.memoryPlaceholder")}
                        defaultValue={v.memoryMb}
                      />
                      <FieldDescription>
                        {t("form.advanced.memoryHelp")}
                      </FieldDescription>
                      <FieldError errors={errs("memoryMb")} />
                    </Field>
                    <Field data-invalid={invalid("deploymentKeep")}>
                      <FieldLabel htmlFor="app-keep">
                        {t("form.advanced.deploymentKeep")}
                      </FieldLabel>
                      <Input
                        id="app-keep"
                        name="deploymentKeep"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={v.deploymentKeep}
                      />
                      <FieldDescription>
                        {t("form.advanced.deploymentKeepHelp")}
                      </FieldDescription>
                      <FieldError errors={errs("deploymentKeep")} />
                    </Field>
                  </div>

                  {mode === "edit" && (
                    <Field>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          name="ignoreErrorLogs"
                          defaultChecked={v.ignoreErrorLogs === "on"}
                        />
                        {t("form.advanced.ignoreErrors")}
                      </label>
                      <FieldDescription>
                        {t.rich("form.advanced.ignoreErrorsHelp", {
                          em: (chunks) => <em>{chunks}</em>,
                        })}
                      </FieldDescription>
                    </Field>
                  )}

                  <Field data-invalid={invalid("previewDomain")}>
                    <FieldLabel>{t("form.previews.label")}</FieldLabel>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        name="previewsEnabled"
                        defaultChecked={v.previewsEnabled === "on"}
                      />
                      {t("form.previews.switch")}
                    </label>
                    <Input
                      name="previewDomain"
                      placeholder={t("form.previews.domainPlaceholder")}
                      defaultValue={v.previewDomain}
                      className="mt-2"
                      aria-label={t("form.previews.domainAria")}
                    />
                    <FieldDescription>
                      {t.rich("form.previews.help", {
                        code,
                        em: (chunks) => <em>{chunks}</em>,
                      })}
                    </FieldDescription>
                    <FieldError errors={errs("previewDomain")} />
                  </Field>

                  <Field data-invalid={invalid("buildArgs")}>
                    <FieldLabel htmlFor="app-build-args">
                      {t("form.advanced.buildArgs")}
                    </FieldLabel>
                    {buildArgsHidden ? (
                      <FieldDescription>
                        {t("form.advanced.buildArgsHidden")}
                      </FieldDescription>
                    ) : (
                      <>
                        <Textarea
                          id="app-build-args"
                          name="buildArgs"
                          rows={3}
                          placeholder="NODE_VERSION=22"
                          defaultValue={v.buildArgs}
                          className="font-mono text-xs"
                        />
                        <FieldDescription>
                          {t.rich("form.advanced.buildArgsHelp", { code })}
                        </FieldDescription>
                      </>
                    )}
                    <FieldError errors={errs("buildArgs")} />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        {state.error && !portConflict && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        {state.saved && !state.error && (
          <FieldDescription>{t("form.toast.saved")}</FieldDescription>
        )}

        {!readOnly && (
        <div className="flex justify-end gap-2">
          {cancelHref && (
            <Button asChild variant="outline">
              <Link href={cancelHref}>{tc("actions.cancel")}</Link>
            </Button>
          )}
          <Button type="submit" disabled={domainMode ? domainPending : pending}>
            {(domainMode ? domainPending : pending) && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {(domainMode ? domainPending : pending)
              ? mode === "create"
                ? tc("states.creating")
                : tc("states.saving")
              : submitLabel}
          </Button>
        </div>
        )}
      </FieldGroup>
      </fieldset>
    </form>
  )
}
