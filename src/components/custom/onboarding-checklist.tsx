"use client"

import { Check, Circle, EyeOff } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { LinkArrow } from "@/components/custom/arrows"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Onboarding } from "@/features/onboarding/onboarding.entity"
import { dismissOnboardingAction } from "@/features/onboarding/onboarding.actions"

/**
 * Getting-started checklist for the owner, computed by the API from the real
 * state (so a step ticks itself once it is true). It disappears when every
 * required step is done, or for good when the owner hides it.
 */
export function OnboardingChecklist({ onboarding }: { onboarding: Onboarding }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const required = onboarding.steps.filter((s) => !s.optional)
  const done = required.filter((s) => s.done).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mulai dengan aoox</CardTitle>
        <CardDescription>
          {done} dari {required.length} langkah wajib selesai. Daftar ini hilang
          sendiri kalau semuanya beres.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await dismissOnboardingAction()
                if (!r.ok) setError(r.error)
              })
            }
          >
            <EyeOff data-icon="inline-start" />
            Sembunyikan
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Langkah wajib selesai"
          aria-valuemin={0}
          aria-valuemax={required.length}
          aria-valuenow={done}
        >
          <div
            className="h-full bg-primary motion-safe:transition-[width]"
            style={{ width: `${(done / Math.max(required.length, 1)) * 100}%` }}
          />
        </div>
        <ul className="divide-y rounded-md border text-xs">
          {onboarding.steps.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  s.done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.done ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <Circle className="size-1.5 fill-current" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={s.done ? "text-muted-foreground" : "font-medium"}>
                  {s.title}
                  <span className="sr-only">
                    {s.done ? " (selesai)" : " (belum)"}
                  </span>
                </span>
                {!s.done && (
                  <span className="block text-muted-foreground">{s.hint}</span>
                )}
              </span>
              {!s.done && (
                <Button asChild variant="outline" size="sm">
                  <Link href={s.href}>
                    Buka
                    <LinkArrow />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
