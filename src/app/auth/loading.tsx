import { Skeleton } from "@/components/ui/Skeleton";

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-6 py-12">
      <div className="mx-auto flex min-h-[70vh] max-w-[1120px] flex-col overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--canvas)] lg:flex-row">
        <div className="hidden w-[44%] bg-[var(--ink)] p-10 lg:block">
          <Skeleton className="h-5 w-28 bg-white/10" />
          <Skeleton className="mt-10 h-8 w-56 bg-white/10" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-4 w-5/6 bg-white/10" />
            <Skeleton className="h-4 w-4/6 bg-white/10" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-[380px] space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
