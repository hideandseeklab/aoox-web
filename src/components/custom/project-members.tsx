"use client"

import { Trash2, UserPlus } from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberAction,
} from "@/features/project-member/project-member.actions"
import {
  PROJECT_ROLE_LABEL,
  type ProjectMembers,
  type ProjectRole,
} from "@/features/project-member/project-member.entity"

const ROLES: ProjectRole[] = ["admin", "developer", "viewer"]

/**
 * Who sees this project. Platform owners/admins and the creator are always
 * in (implicit); other members are added by e-mail (they must already have
 * an account — invite from Settings → Tim). Only project admins edit.
 */
export function ProjectMembers({
  projectId,
  data,
}: {
  projectId: string
  data: ProjectMembers
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ProjectRole>("developer")
  const canEdit = data.myRole === "admin"

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anggota</CardTitle>
        <CardDescription>
          Siapa yang melihat project ini. Owner/admin platform dan pembuat
          project selalu termasuk; anggota lain ditambah lewat e-mail akun yang
          sudah ada (undang dari Settings → Tim).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y rounded-md border text-sm">
          {data.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {m.name || m.email}
                  {m.name && (
                    <span className="ms-1 text-muted-foreground">
                      {m.email}
                    </span>
                  )}
                </p>
                {m.implicit && (
                  <p className="text-xs text-muted-foreground">
                    {m.platformRole === "member"
                      ? "pembuat project"
                      : `${m.platformRole} platform`}
                  </p>
                )}
              </div>
              {canEdit && !m.implicit ? (
                <>
                  <Select
                    value={m.role}
                    onValueChange={(r) =>
                      run(() =>
                        updateProjectMemberAction(
                          projectId,
                          m.userId,
                          r as ProjectRole
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32" aria-label="Peran">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {PROJECT_ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Keluarkan"
                    disabled={pending}
                    onClick={() =>
                      run(() => removeProjectMemberAction(projectId, m.userId))
                    }
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : (
                <Badge variant="outline">{PROJECT_ROLE_LABEL[m.role]}</Badge>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                const r = await addProjectMemberAction(projectId, email, role)
                if (r.ok) setEmail("")
                return r
              })
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@akun-yang-sudah-ada"
              className="h-8 min-w-48 flex-1"
              aria-label="E-mail anggota"
            />
            <Select
              value={role}
              onValueChange={(r) => setRole(r as ProjectRole)}
            >
              <SelectTrigger className="h-8 w-32" aria-label="Peran baru">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {PROJECT_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={pending || !email}>
              <UserPlus data-icon="inline-start" />
              Tambah
            </Button>
          </form>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Admin mengelola anggota dan bisa menghapus project; developer
          melakukan aksi lain; viewer hanya membaca.
        </p>
      </CardContent>
    </Card>
  )
}
