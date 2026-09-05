import { Skeleton } from "@/components/ui/Skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--canvas)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-[var(--ink)] p-10 lg:block">
          <Skeleton className="h-5 w-32 bg-white/10" />
          <Skeleton className="mt-8 h-9 w-64 bg-white/10" />
          <Skeleton className="mt-4 h-4 w-5/6 bg-white/10" />
          <div className="mt-12 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-10 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-10 w-full rounded-xl bg-white/10" />
          </div>
        </div>
        <div className="flex flex-col gap-6 p-8 lg:p-10">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-10 rounded-full" />
            <Skeleton className="h-2 w-6 rounded-full" />
            <Skeleton className="h-2 w-6 rounded-full" />
            <Skeleton className="h-2 w-6 rounded-full" />
            <Skeleton className="h-2 w-6 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="mt-auto flex justify-between gap-4 border-t border-[var(--border-default)] pt-6">
            <Skeleton className="h-12 w-24 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
