"use client"

import { BookOpen, ExternalLink, Rocket } from "lucide-react"
import { useState } from "react"
import { DeployTemplateDialog } from "@/components/custom/deploy-template-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Project } from "@/features/project/project.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Template } from "@/features/template/template.entity"

export function TemplatesCatalog({
  templates,
  projects,
  proxy,
  defaultProjectId,
}: {
  templates: Template[]
  projects: Project[]
  proxy: ProxyStatus
  defaultProjectId?: string
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Template | null>(null)
  const q = query.trim().toLowerCase()
  const shown = q
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      )
    : templates

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari template…"
        className="max-w-sm"
        aria-label="Cari template"
      />
      {projects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Buat project dulu — template di-deploy ke dalam sebuah project.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                {t.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logo}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 dark:invert"
                  />
                ) : (
                  <div className="size-8 shrink-0 rounded bg-muted" />
                )}
                <div className="min-w-0">
                  <CardTitle className="truncate">{t.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    v{t.version}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                size="sm"
                disabled={projects.length === 0}
                onClick={() => setSelected(t)}
              >
                <Rocket data-icon="inline-start" />
                Deploy
              </Button>
              {t.links.docs && (
                <Button asChild size="sm" variant="ghost">
                  <a href={t.links.docs} target="_blank" rel="noreferrer">
                    <BookOpen data-icon="inline-start" />
                    Docs
                  </a>
                </Button>
              )}
              {t.links.website && (
                <Button
                  asChild
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Situs"
                >
                  <a href={t.links.website} target="_blank" rel="noreferrer">
                    <ExternalLink />
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada yang cocok.</p>
        )}
      </div>
      <DeployTemplateDialog
        key={selected?.id ?? "none"}
        template={selected}
        projects={projects}
        proxy={proxy}
        defaultProjectId={defaultProjectId}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
