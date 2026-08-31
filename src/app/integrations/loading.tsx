import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardSkeleton } from "@/app/dashboard/DashboardSkeleton";

export default function IntegrationsLoading() {
  return (
    <DashboardLayout title="Integrations">
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
