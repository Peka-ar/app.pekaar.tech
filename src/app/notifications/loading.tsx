import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardSkeleton } from "@/app/dashboard/DashboardSkeleton";

export default function NotificationsLoading() {
  return (
    <DashboardLayout title="Notifications">
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
