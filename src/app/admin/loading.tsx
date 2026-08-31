import React from 'react';
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminDashboardSkeleton } from "./dashboard/AdminDashboardSkeleton";

export default function AdminLoading() {
  return (
    <AdminLayout title="Admin">
      <AdminDashboardSkeleton />
    </AdminLayout>
  );
}
