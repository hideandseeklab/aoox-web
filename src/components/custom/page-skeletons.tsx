import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-level `loading.tsx` fallbacks. Shapes mirror the real pages
 * (header + grid of cards / header + tab strip + panels) so the swap to real
 * content doesn't jump. They use the shared `Skeleton` (`data-slot="skeleton"`),
 * and the `data-route-loading` marker on each root is how `NavigationProgress` knows the content hasn't arrived yet.
 */

function PageHeaderSkeleton({ withBack = false }: { withBack?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {withBack ? <Skeleton className="mt-0.5 size-9 shrink-0" /> : null}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
    </div>
  )
}

/** Cards grid — `/projects`. */
export function CardListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" data-route-loading="">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  )
}

/** Header + tab strip + panels — project / application / database / compose detail. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" data-route-loading="">
      <PageHeaderSkeleton withBack />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
}
