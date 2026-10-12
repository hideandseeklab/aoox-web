import type { ComponentProps, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Bordered, rounded table used by every list tab (domains, mounts, jobs, backups, history).
 * On narrow screens the table scrolls horizontally inside its own box (`minWidth` keeps the
 * columns readable), so the page itself never scrolls sideways. Compose it with
 * `DataTableHeader`/`DataHead`, `DataTableBody`/`DataRow`/`DataCell` and `DataActions`.
 */
export function DataTable({
  children,
  minWidth = "min-w-[40rem]",
  className,
}: {
  children: ReactNode
  /** A Tailwind `min-w-*` class for the table itself. */
  minWidth?: string
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <Table className={minWidth}>{children}</Table>
    </div>
  )
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return (
    <TableHeader className="bg-muted/30">
      <TableRow className="hover:bg-transparent">{children}</TableRow>
    </TableHeader>
  )
}

/** Small uppercase muted column title. */
export function DataHead({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "h-9 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

/** Header of the trailing actions column: narrow, right-aligned, screen-reader label only. */
export function DataActionsHead({ label }: { label: string }) {
  return (
    <DataHead className="w-px text-end">
      <span className="sr-only">{label}</span>
    </DataHead>
  )
}

export const DataTableBody = TableBody

export function DataRow({
  className,
  ...props
}: ComponentProps<typeof TableRow>) {
  return <TableRow className={cn("hover:bg-muted/30", className)} {...props} />
}

/** Cell with the table's padding; `mono` is for hosts, paths, cron, sizes and image refs. */
export function DataCell({
  mono,
  className,
  ...props
}: ComponentProps<typeof TableCell> & { mono?: boolean }) {
  return (
    <TableCell
      className={cn("px-3 py-2.5", mono && "font-mono", className)}
      {...props}
    />
  )
}

/** Trailing cell: icon-only actions, right-aligned on one line. */
export function DataActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DataCell className="w-px text-end">
      <div className={cn("flex items-center justify-end gap-1", className)}>
        {children}
      </div>
    </DataCell>
  )
}

/** Full-width row under a data row (expanded history, logs). */
export function DataDetailRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={colSpan} className="px-3 py-3 whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  )
}

/** Ghost icon button for a row action; the label doubles as aria-label and tooltip. */
export function IconButton({
  label,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type={props.asChild ? undefined : "button"}
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      {...props}
    />
  )
}
