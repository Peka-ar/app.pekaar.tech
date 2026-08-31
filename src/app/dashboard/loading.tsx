import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardSkeleton } from "./DashboardSkeleton";

export default function DashboardLoading() {
  return (
    <DashboardLayout title="Overview">
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
