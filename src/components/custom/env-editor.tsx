"use client"

import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Eye, EyeOff, Plus, StickyNote, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import {
  EnvRowMoveMenu,
  SortableEnvRow,
} from "@/components/custom/env-row-reorder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  type EnvRow,
  moveRow,
  NOTE_MAX,
  sameEnvText,
  toRows,
  toText,
  varKeys,
} from "@/features/variable-set/env-rows"
import { SECRET_NAME } from "@/features/variable-set/variable-set.entity"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

/**
 * Secret flags for the variable set environment editor. `initial*` are the flags
 * the API reported when the values were revealed; the editor submits only the
 * ones the user changed (JSON `{NAME: boolean}` in the hidden field `name`).
 */
export interface SecretFlagsConfig {
  /** Name of the hidden field that carries the JSON of the changed flags. */
  name: string
  secretKeys: string[]
  plainKeys: string[]
}

/** Rows only move up and down. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/**
 * Per-line env editor with masked values. Submits as one `KEY=VALUE` text
 * field (`name`) so the API contract stays a plain text blob. Rows mode keeps
 * everything the text holds: a variable's note (the `#` lines directly above
 * it) is shown and edited under the row, standalone comments are their own
 * rows, and blank-line grouping survives (`features/variable-set/env-rows.ts`).
 * Rows (variables with their notes, and comment blocks) can be reordered by
 * dragging the handle (mouse, touch, or Space + arrow keys) or from the move
 * menu; the new order is the order of the submitted text.
 * Text mode exposes the raw blob for pasting a whole .env.
 *
 * Unless read-only, the editor reports unsaved changes (`useUnsavedChanges`)
 * while its text differs from `defaultValue` as it was when it mounted (a
 * reorder counts) or a secret flag was changed, so leaving the page asks
 * first. The baseline is fixed at mount: owners remount the editor (`key`)
 * after a successful save, or unmount it.
 */
export function EnvEditor({
  name,
  defaultValue,
  placeholder,
  readOnly = false,
  secrets,
  initialShowValues = false,
}: {
  /** Start with the values shown (the single toggle covers every row). */
  initialShowValues?: boolean
  name: string
  defaultValue: string
  placeholder?: string
  /** Shows a Secret switch per variable (variable set environments only). */
  secrets?: SecretFlagsConfig
  /** Viewers: values stay masked/revealable, nothing can be edited, added or removed. */
  readOnly?: boolean
}) {
  const t = useTranslations("common.envEditor")
  const [text, setText] = useState(defaultValue)
  const [rows, setRows] = useState<EnvRow[]>(() => toRows(defaultValue))
  const [mode, setMode] = useState<"rows" | "text">("rows")
  const [revealed, setRevealed] = useState(initialShowValues)
  // Rows whose note editor is open (by row id).
  const [openNotes, setOpenNotes] = useState<Set<number>>(() => new Set())
  const baseId = useId()
  // Secret flags: what the user changed (name -> flag). A variable that was
  // not in the revealed text starts as secret when its name looks like one,
  // which is also what the API does when no flag is sent.
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [initial] = useState(() => ({
    keys: new Set(varKeys(toRows(defaultValue))),
    secret: new Set(secrets?.secretKeys ?? []),
    plain: new Set(secrets?.plainKeys ?? []),
  }))
  const defaultSecret = (key: string) =>
    initial.secret.has(key)
      ? true
      : initial.plain.has(key) || initial.keys.has(key)
        ? false
        : SECRET_NAME.test(key)
  const isSecret = (key: string) => touched[key] ?? defaultSecret(key)
  const toggleSecret = (key: string) => {
    const next = !isSecret(key)
    setTouched((prev) => {
      const copy = { ...prev }
      if (next === defaultSecret(key)) delete copy[key]
      else copy[key] = next
      return copy
    })
  }
  // Only flags of variables that are in the final text are submitted.
  const flagsJson = (() => {
    if (!secrets) return ""
    const present = new Set(varKeys(toRows(text)))
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(touched)) if (present.has(k)) out[k] = v
    return JSON.stringify(out)
  })()
  const [baseline] = useState(defaultValue)
  const flagsChanged = flagsJson !== "" && flagsJson !== "{}"
  useUnsavedChanges(
    !readOnly && (flagsChanged || !sameEnvText(text, baseline))
  )

  const updateRows = (next: EnvRow[]) => {
    setRows(next)
    setText(toText(next))
  }
  const patchRow = (id: number, patch: Partial<EnvRow>) =>
    updateRows(
      rows.map((r) => (r.id === id ? ({ ...r, ...patch } as EnvRow) : r))
    )
  const setNoteOpen = (id: number, open: boolean) =>
    setOpenNotes((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  const switchMode = (next: "rows" | "text") => {
    if (next === "rows") {
      setRows(toRows(text))
      setOpenNotes(new Set())
    }
    setMode(next)
  }
  // 1-based numbers for the aria labels: variables and comments counted apart.
  const numbers = new Map<number, number>()
  {
    let vars = 0
    let comments = 0
    for (const r of rows) {
      numbers.set(r.id, r.kind === "var" ? ++vars : ++comments)
    }
  }
  const labelOf = (row: EnvRow) => {
    const n = numbers.get(row.id) ?? 0
    if (row.kind === "block") return t("commentAria", { n })
    return row.key.trim() || t("rowFallback", { n })
  }

  // Reordering (Rows view, editors only). Sortable ids are strings: dnd-kit
  // treats a falsy id (row 0) as "nothing".
  const sortId = (row: EnvRow) => `${baseId}-s-${row.id}`
  const indexOf = (id: UniqueIdentifier) =>
    rows.findIndex((r) => sortId(r) === id)
  const [moveStatus, setMoveStatus] = useState("")
  // `announce`: the move menu says where the row went; a drag is announced
  // by dnd-kit itself.
  const moveTo = (from: number, to: number, announce = true) => {
    if (from === to) return
    updateRows(moveRow(rows, from, to))
    if (!announce) return
    setMoveStatus(
      t("movedStatus", {
        name: labelOf(rows[from]),
        position: to + 1,
        total: rows.length,
      })
    )
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const nameAt = (id: UniqueIdentifier) => {
    const i = indexOf(id)
    return i >= 0 ? labelOf(rows[i]) : ""
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t("dragStart", {
        name: nameAt(active.id),
        position: indexOf(active.id) + 1,
        total: rows.length,
      }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dragOver", {
            name: nameAt(active.id),
            position: indexOf(over.id) + 1,
            total: rows.length,
          })
        : t("dragOutside", { name: nameAt(active.id) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("dragEnd", {
            name: nameAt(active.id),
            position: indexOf(over.id) + 1,
            total: rows.length,
          })
        : t("dragCancel", { name: nameAt(active.id) }),
    onDragCancel: ({ active }) => t("dragCancel", { name: nameAt(active.id) }),
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = indexOf(active.id)
    const to = indexOf(over.id)
    if (from >= 0 && to >= 0) moveTo(from, to, false)
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={text} />
      {secrets && <input type="hidden" name={secrets.name} value={flagsJson} />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          <Button
            type="button"
            size="sm"
            variant={mode === "rows" ? "secondary" : "ghost"}
            onClick={() => switchMode("rows")}
          >
            {t("rows")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "text" ? "secondary" : "ghost"}
            onClick={() => switchMode("text")}
          >
            {t("text")}
          </Button>
        </div>
        {mode === "rows" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff /> : <Eye />}
            {revealed ? t("hideValues") : t("showValues")}
          </Button>
        )}
      </div>

      {mode === "text" ? (
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder ?? "KEY=value\nANOTHER=value"}
          className="font-mono text-xs"
          aria-label={t("textAria")}
        />
      ) : (
        <div className="space-y-1.5">
          <DndContext
            id={`${baseId}-dnd`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[verticalOnly]}
            onDragEnd={onDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: { draggable: t("dragInstructions") },
            }}
          >
            <SortableContext
              items={rows.map(sortId)}
              strategy={verticalListSortingStrategy}
            >
              {rows.map((row, index) => {
                const gap = row.blankBefore > 0 && row !== rows[0] ? "pt-2" : ""
                const label = labelOf(row)
                const move = (to: number) => moveTo(index, to)
                if (row.kind === "block") {
                  const n = numbers.get(row.id) ?? 0
                  return (
                    <SortableEnvRow
                      key={row.id}
                      id={sortId(row)}
                      disabled={readOnly}
                      label={label}
                      className={gap}
                    >
                      {(handle) => (
                        <div className="flex items-start gap-1.5">
                          {handle}
                          <Textarea
                            aria-label={t("commentAria", { n })}
                            id={`${baseId}-c-${row.id}`}
                            value={row.text}
                            onChange={(e) =>
                              patchRow(row.id, { text: e.target.value })
                            }
                            readOnly={readOnly}
                            rows={Math.min(row.text.split("\n").length, 6)}
                            className="min-h-0 min-w-0 flex-1 py-1 font-mono text-xs text-muted-foreground"
                            spellCheck={false}
                          />
                          {!readOnly && (
                            <>
                              <EnvRowMoveMenu
                                label={label}
                                index={index}
                                total={rows.length}
                                onMove={move}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("removeCommentAria", { n })}
                                onClick={() =>
                                  updateRows(
                                    rows.filter((r) => r.id !== row.id)
                                  )
                                }
                              >
                                <Trash2 />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </SortableEnvRow>
                  )
                }
                const i = (numbers.get(row.id) ?? 1) - 1
                const key = row.key.trim()
                const noteOpen = openNotes.has(row.id)
                const noteId = `${baseId}-n-${row.id}`
                // Under the row, the note lines up with the name field.
                const indent = readOnly ? "" : "ml-6.5"
                return (
                  <SortableEnvRow
                    key={row.id}
                    id={sortId(row)}
                    disabled={readOnly}
                    label={label}
                    className={`space-y-1 ${gap}`}
                    handleClassName={secrets ? "order-1 sm:order-none" : ""}
                  >
                    {(handle) => (
                      <>
                        <div
                          className={
                            secrets
                              ? "flex flex-wrap items-center gap-1.5 sm:flex-nowrap"
                              : "flex items-center gap-1.5"
                          }
                        >
                          {handle}
                          <Input
                            aria-label={t("keyAria", { n: i + 1 })}
                            id={`${baseId}-k-${row.id}`}
                            value={row.key}
                            onChange={(e) =>
                              patchRow(row.id, { key: e.target.value })
                            }
                            placeholder="KEY"
                            readOnly={readOnly}
                            className={
                              !secrets
                                ? "w-2/5 max-w-sm font-mono text-xs"
                                : readOnly
                                  ? "w-full font-mono text-xs sm:w-2/5 sm:max-w-sm"
                                  : // Phone: the handle and name share their line
                                    // with the note, move and remove buttons; the
                                    // value and Secret go below, under the name.
                                    "order-1 min-w-0 flex-1 basis-[calc(100%-8.25rem)] font-mono text-xs sm:order-none sm:w-2/5 sm:max-w-sm sm:flex-none sm:basis-auto"
                            }
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <Input
                            aria-label={t("valueAria", { n: i + 1 })}
                            id={`${baseId}-v-${row.id}`}
                            type={revealed ? "text" : "password"}
                            value={row.value}
                            onChange={(e) =>
                              patchRow(row.id, { value: e.target.value })
                            }
                            placeholder="value"
                            readOnly={readOnly}
                            className={
                              secrets
                                ? readOnly
                                  ? "order-3 min-w-0 flex-1 basis-40 font-mono text-xs sm:order-none"
                                  : "order-3 ml-6.5 min-w-0 flex-1 basis-40 font-mono text-xs sm:order-none sm:ml-0"
                                : "min-w-0 flex-1 font-mono text-xs"
                            }
                            autoComplete="off"
                            spellCheck={false}
                          />
                          {secrets && key && (
                            <label className="order-4 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:order-none">
                              <Switch
                                size="sm"
                                checked={isSecret(key)}
                                onCheckedChange={() => toggleSecret(key)}
                                disabled={readOnly}
                                aria-label={t("secretAria", { name: key })}
                              />
                              {t("secret")}
                            </label>
                          )}
                          {!readOnly && (
                            <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-none">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={
                                  row.note
                                    ? t("editNoteAria", { name: label })
                                    : t("addNoteAria", { name: label })
                                }
                                aria-expanded={noteOpen}
                                aria-controls={noteOpen ? noteId : undefined}
                                title={row.note ? t("editNote") : t("addNote")}
                                className={
                                  row.note ? "" : "text-muted-foreground"
                                }
                                onClick={() => setNoteOpen(row.id, !noteOpen)}
                              >
                                <StickyNote />
                              </Button>
                              <EnvRowMoveMenu
                                label={label}
                                index={index}
                                total={rows.length}
                                onMove={move}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("removeAria", { name: label })}
                                onClick={() =>
                                  updateRows(
                                    rows.filter((r) => r.id !== row.id)
                                  )
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          )}
                        </div>
                        {noteOpen && !readOnly ? (
                          <div className={`space-y-1 ${indent}`}>
                            <Textarea
                              id={noteId}
                              aria-label={t("noteAria", { name: label })}
                              value={row.note}
                              onChange={(e) =>
                                patchRow(row.id, { note: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  setNoteOpen(row.id, false)
                                }
                              }}
                              maxLength={NOTE_MAX}
                              rows={2}
                              placeholder={t("notePlaceholder")}
                              className="text-xs"
                              autoFocus
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setNoteOpen(row.id, false)}
                              >
                                {t("noteDone")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          row.note.trim() && (
                            <p
                              className={`px-0.5 text-xs break-words whitespace-pre-wrap text-muted-foreground ${indent}`}
                            >
                              {row.note.trim()}
                            </p>
                          )
                        )}
                      </>
                    )}
                  </SortableEnvRow>
                )
              })}
            </SortableContext>
          </DndContext>
          <p className="sr-only" aria-live="polite">
            {moveStatus}
          </p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-0.5 h-9 w-full border-dashed border-border-dashed bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() =>
                updateRows([
                  ...rows,
                  {
                    kind: "var",
                    id: Math.max(-1, ...rows.map((r) => r.id)) + 1,
                    key: "",
                    value: "",
                    note: "",
                    noteSource: [],
                    blankBefore: 0,
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              {t("addVariable")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
