"use client"

import { HardDrive, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { AddDialog } from "@/components/custom/add-dialog"
import {
  DataActions,
  DataActionsHead,
  DataCell,
  DataHead,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHeader,
  IconButton,
} from "@/components/custom/data-table"
import { EmptyState } from "@/components/custom/empty-state"
import { MountContentDialog } from "@/components/custom/mount-content-dialog"
import { SectionHeader } from "@/components/custom/section-header"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  addMountAction,
  deleteMountAction,
  updateMountAction,
} from "@/features/application/application.actions"
import type {
  Mount,
  MountOwner,
  MountType,
} from "@/features/application/application.entity"

/**
 * Volumes (persistent data), host bind mounts (owner/admin) and small config
 * files stored on the platform. Every change re-creates the container on the
 * API side, so it applies immediately without a rebuild.
 */
export function ApplicationMounts({
  owner,
  mounts,
  canBind,
  canEdit = true,
}: {
  owner: MountOwner
  mounts: Mount[]
  canBind: boolean
  /** False for project viewers: the list is read-only. */
  canEdit?: boolean
}) {
  const t = useTranslations("applications")
  const [type, setType] = useState<MountType>("volume")
  const [name, setName] = useState("")
  const [hostPath, setHostPath] = useState("")
  const [containerPath, setContainerPath] = useState("")
  const [content, setContent] = useState("")
  const [readOnly, setReadOnly] = useState(false)

  const reset = () => {
    setType("volume")
    setName("")
    setHostPath("")
    setContainerPath("")
    setContent("")
    setReadOnly(false)
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("mounts.section.title")}
        description={t("mounts.section.description", { count: mounts.length })}
        action={
          canEdit && (
            <AddDialog
              title={t("mounts.add.title")}
              description={t.rich("mounts.add.description", {
                b: (chunks) => <b>{chunks}</b>,
                suffix: t(
                  owner.kind === "database"
                    ? "mounts.add.suffixDatabase"
                    : "mounts.add.suffixOther"
                ),
              })}
              pendingLabel={t("mounts.applying")}
              onOpenChange={reset}
              onSubmit={() =>
                addMountAction(owner, {
                  type,
                  containerPath: containerPath.trim(),
                  ...(type === "volume" ? { name: name.trim() } : {}),
                  ...(type === "bind"
                    ? { hostPath: hostPath.trim(), readOnly }
                    : {}),
                  ...(type === "file" ? { content } : { readOnly }),
                })
              }
            >
              <div className="space-y-1">
                <Label htmlFor="mt-type">{t("mounts.add.kind")}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as MountType)}
                >
                  <SelectTrigger id="mt-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="volume">
                      {t("mounts.type.volume")}
                    </SelectItem>
                    <SelectItem value="bind" disabled={!canBind}>
                      {t("mounts.type.bind")}
                    </SelectItem>
                    <SelectItem value="file">{t("mounts.type.file")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "volume" && (
                <div className="space-y-1">
                  <Label htmlFor="mt-name">{t("mounts.add.volumeName")}</Label>
                  <Input
                    id="mt-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="uploads"
                    className="font-mono"
                    required
                  />
                </div>
              )}
              {type === "bind" && (
                <div className="space-y-1">
                  <Label htmlFor="mt-host">{t("mounts.add.hostPath")}</Label>
                  <Input
                    id="mt-host"
                    value={hostPath}
                    onChange={(e) => setHostPath(e.target.value)}
                    placeholder="/srv/app/data"
                    className="font-mono"
                    required
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="mt-path">{t("mounts.add.containerPath")}</Label>
                <Input
                  id="mt-path"
                  value={containerPath}
                  onChange={(e) => setContainerPath(e.target.value)}
                  placeholder={
                    type === "file" ? "/etc/app/config.yml" : "/app/data"
                  }
                  className="font-mono"
                  required
                />
              </div>
              {type !== "file" && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={readOnly} onCheckedChange={setReadOnly} />
                  {t("mounts.readOnly")}
                </label>
              )}
              {type === "file" && (
                <div className="space-y-1">
                  <Label htmlFor="mt-content">
                    {t("mounts.add.fileContent")}
                  </Label>
                  <Textarea
                    id="mt-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </AddDialog>
          )
        }
      />
      {mounts.length === 0 ? (
        <EmptyState icon={HardDrive} compact>
          {t("mounts.empty")}
        </EmptyState>
      ) : (
        <>
          {/* Phone: one card per mount, so nothing scrolls sideways. */}
          <ul className="space-y-2 sm:hidden">
            {mounts.map((m) => (
              <MountCard key={m.id} owner={owner} mount={m} canEdit={canEdit} />
            ))}
          </ul>
          <DataTable minWidth="min-w-[36rem]" className="hidden sm:block">
            <DataTableHeader>
              <DataHead>{t("mounts.columns.path")}</DataHead>
              <DataHead>{t("mounts.columns.source")}</DataHead>
              <DataHead>{t("mounts.columns.type")}</DataHead>
              <DataActionsHead label={t("mounts.columns.actions")} />
            </DataTableHeader>
            <DataTableBody>
              {mounts.map((m) => (
                <MountRow
                  key={m.id}
                  owner={owner}
                  mount={m}
                  canEdit={canEdit}
                />
              ))}
            </DataTableBody>
          </DataTable>
        </>
      )}
    </div>
  )
}

type MountProps = { owner: MountOwner; mount: Mount; canEdit: boolean }

function useMountSource(mount: Mount) {
  const t = useTranslations("applications")
  return mount.type === "volume"
    ? t("mounts.row.volumeSource", { name: mount.name ?? "" })
    : mount.type === "bind"
      ? mount.hostPath
      : mount.name
}

function MountBadges({ mount }: { mount: Mount }) {
  const t = useTranslations("applications")
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline">{t(`mounts.type.${mount.type}`)}</Badge>
      {mount.readOnly && <Badge variant="secondary">{t("mounts.row.ro")}</Badge>}
    </div>
  )
}

/** Content dialog (or the "hidden for viewers" label) and detach: shared by the table row and the phone card. */
function MountActions({ owner, mount, canEdit }: MountProps) {
  const t = useTranslations("applications")
  return (
    <>
      {mount.type === "file" && (
        <MountContentDialog
          title={mount.name ?? mount.containerPath}
          description={mount.containerPath}
          content={mount.content ?? ""}
          canEdit={canEdit}
          openLabel={t("mounts.row.contentAria", { name: mount.name ?? "" })}
          saveLabel={t("mounts.row.saveApply")}
          pendingLabel={t("mounts.applying")}
          contentAria={t("mounts.row.contentAria", { name: mount.name ?? "" })}
          onSave={(content) => updateMountAction(owner, mount.id, { content })}
          hidden={mount.contentHidden}
          hiddenLabel={t("mounts.row.contentHidden")}
        />
      )}
      {canEdit && (
        <ConfirmDialog
          trigger={
            <IconButton label={t("mounts.row.deleteAria")}>
              <Trash2 />
            </IconButton>
          }
          title={t("mounts.row.detachTitle", { name: mount.name ?? "" })}
          description={
            mount.type === "volume"
              ? t("mounts.row.detachVolumeDescription")
              : t("mounts.row.detachDescription")
          }
          confirmLabel={
            mount.type === "volume"
              ? t("mounts.row.detachAndDelete")
              : t("mounts.row.detach")
          }
          tone={mount.type === "volume" ? "destructive" : "neutral"}
          onConfirm={() =>
            deleteMountAction(owner, mount.id, mount.type === "volume")
          }
          alternative={
            mount.type === "volume"
              ? {
                  label: t("mounts.row.detachKeep"),
                  onConfirm: () => deleteMountAction(owner, mount.id, false),
                }
              : undefined
          }
        />
      )}
    </>
  )
}

function MountRow(props: MountProps) {
  const source = useMountSource(props.mount)
  return (
    <DataRow>
      <DataCell mono>{props.mount.containerPath}</DataCell>
      <DataCell mono className="text-muted-foreground">
        {source}
      </DataCell>
      <DataCell>
        <MountBadges mount={props.mount} />
      </DataCell>
      <DataActions>
        <MountActions {...props} />
      </DataActions>
    </DataRow>
  )
}

function MountCard(props: MountProps) {
  const { mount, canEdit } = props
  const source = useMountSource(mount)
  const hasActions = canEdit || mount.type === "file"
  return (
    <li className="space-y-2 rounded-lg border p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-mono text-sm font-medium break-all">
          {mount.containerPath}
        </div>
        <div className="shrink-0">
          <MountBadges mount={mount} />
        </div>
      </div>
      <div className="font-mono break-all text-muted-foreground">{source}</div>
      {hasActions && (
        <div className="flex items-center justify-end gap-1">
          <MountActions {...props} />
        </div>
      )}
    </li>
  )
}
