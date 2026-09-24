export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-sand ${className}`} aria-hidden />
}

export function CatalogSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Cargando servicios">
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-48 w-[78%] shrink-0 rounded-3xl" />
        <Skeleton className="h-48 w-[78%] shrink-0 rounded-3xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    </div>
  )
}
