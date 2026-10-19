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
  MountType,
} from "@/features/application/application.entity"

/**
 * Mounts for a compose stack — same three kinds an application/database
 * gets, but each one also names the `service` in the stack it attaches to
 * (a stack is N containers, not one). Unlike those, a change here only
 * takes effect on the stack's next deploy: compose is re-run from the row
 * each time, not a container the API can patch in place.
 */
export function ComposeMounts({
  appId,
  mounts,
  canBind,
  canEdit = true,
}: {
  appId: string
  mounts: Mount[]
  canBind: boolean
  /** False for project viewers: the list is read-only. */
  canEdit?: boolean
}) {
  const t = useTranslations("compose")
  const owner = { kind: "compose" as const, id: appId }
  const [service, setService] = useState("")
  const [type, setType] = useState<MountType>("volume")
  const [name, setName] = useState("")
  const [hostPath, setHostPath] = useState("")
  const [containerPath, setContainerPath] = useState("")
  const [content, setContent] = useState("")
  const [readOnly, setReadOnly] = useState(false)

  const reset = () => {
    setService("")
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
              title={t("mounts.addTitle")}
              description={t.rich("mounts.addDescription", {
                b: (chunks) => <b>{chunks}</b>,
              })}
              onOpenChange={reset}
              onSubmit={() =>
                addMountAction(owner, {
                  type,
                  service: service.trim(),
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
                <Label htmlFor="cmt-service">{t("access.service")}</Label>
                <Input
                  id="cmt-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="web"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cmt-type">{t("mounts.kind")}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as MountType)}
                >
                  <SelectTrigger id="cmt-type" className="w-full">
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
                  <Label htmlFor="cmt-name">{t("mounts.volumeName")}</Label>
                  <Input
                    id="cmt-name"
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
                  <Label htmlFor="cmt-host">{t("mounts.hostPath")}</Label>
                  <Input
                    id="cmt-host"
                    value={hostPath}
                    onChange={(e) => setHostPath(e.target.value)}
                    placeholder="/srv/app/data"
                    className="font-mono"
                    required
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="cmt-path">{t("mounts.containerPath")}</Label>
                <Input
                  id="cmt-path"
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
                  <Label htmlFor="cmt-content">{t("mounts.fileContent")}</Label>
                  <Textarea
                    id="cmt-content"
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
        <DataTable minWidth="min-w-[40rem]">
          <DataTableHeader>
            <DataHead>{t("mounts.columns.service")}</DataHead>
            <DataHead>{t("mounts.columns.path")}</DataHead>
            <DataHead>{t("mounts.columns.source")}</DataHead>
            <DataHead>{t("mounts.columns.type")}</DataHead>
            <DataActionsHead label={t("mounts.columns.actions")} />
          </DataTableHeader>
          <DataTableBody>
            {mounts.map((m) => (
              <MountRow key={m.id} owner={owner} mount={m} canEdit={canEdit} />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  )
}

function MountRow({
  owner,
  mount,
  canEdit,
}: {
  owner: { kind: "compose"; id: string }
  mount: Mount
  canEdit: boolean
}) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")

  const source =
    mount.type === "volume"
      ? t("mounts.volumeSource", { name: mount.name ?? "" })
      : mount.type === "bind"
        ? mount.hostPath
        : mount.name

  return (
    <DataRow>
      <DataCell mono>{mount.service}</DataCell>
      <DataCell mono>{mount.containerPath}</DataCell>
      <DataCell mono className="text-muted-foreground">
        {source}
      </DataCell>
      <DataCell>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">{t(`mounts.type.${mount.type}`)}</Badge>
          {mount.readOnly && <Badge variant="secondary">ro</Badge>}
        </div>
      </DataCell>
      <DataActions>
        {mount.type === "file" && (
          <MountContentDialog
            title={mount.name ?? mount.containerPath}
            description={mount.containerPath}
            content={mount.content ?? ""}
            canEdit={canEdit}
            openLabel={t("mounts.contentAria", { name: mount.name ?? "" })}
            saveLabel={tc("actions.save")}
            pendingLabel={tc("states.saving")}
            contentAria={t("mounts.contentAria", { name: mount.name ?? "" })}
            onSave={(content) => updateMountAction(owner, mount.id, { content })}
            hidden={mount.contentHidden}
            hiddenLabel={t("mounts.contentHidden")}
          />
        )}
        {canEdit && (
          <ConfirmDialog
            trigger={
              <IconButton label={t("mounts.detachAria")}>
                <Trash2 />
              </IconButton>
            }
            title={t("mounts.detachTitle", { name: mount.name ?? "" })}
            description={
              mount.type === "volume"
                ? t("mounts.detachDescriptionVolume")
                : t("mounts.detachDescriptionOther")
            }
            confirmLabel={
              mount.type === "volume"
                ? t("mounts.detachAndDelete")
                : t("mounts.detach")
            }
            tone={mount.type === "volume" ? "destructive" : "neutral"}
            onConfirm={() =>
              deleteMountAction(owner, mount.id, mount.type === "volume")
            }
            alternative={
              mount.type === "volume"
                ? {
                    label: t("mounts.detachKeepData"),
                    onConfirm: () => deleteMountAction(owner, mount.id, false),
                  }
                : undefined
            }
          />
        )}
      </DataActions>
    </DataRow>
  )
}
