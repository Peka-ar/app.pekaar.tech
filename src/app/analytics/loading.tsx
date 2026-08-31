import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardSkeleton } from "@/app/dashboard/DashboardSkeleton";

export default function AnalyticsLoading() {
  return (
    <DashboardLayout title="Analytics & Insights">
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
