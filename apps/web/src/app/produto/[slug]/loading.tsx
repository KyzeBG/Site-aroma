import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="aspect-square w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-40" />
            <Skeleton className="mt-3 h-11 w-full" />
            <Skeleton className="mt-4 h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

