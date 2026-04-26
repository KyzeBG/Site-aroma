import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-border bg-card shadow-soft p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

