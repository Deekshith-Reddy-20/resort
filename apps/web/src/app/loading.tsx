import { Skeleton } from "@/components/Alert";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-16 md:px-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
