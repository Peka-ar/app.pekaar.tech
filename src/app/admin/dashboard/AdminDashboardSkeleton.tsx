import { Skeleton } from "@/components/ui/Skeleton";

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton tone="sage" className="h-9 w-72" />
        <Skeleton tone="sage" className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} tone="sage" className="h-32 rounded-3xl" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} tone="sage" className="h-14 rounded-3xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton tone="sage" className="h-80 rounded-3xl" />
        <Skeleton tone="sage" className="h-80 rounded-3xl" />
      </div>

      <Skeleton tone="sage" className="h-80 rounded-3xl" />
    </div>
  );
}
