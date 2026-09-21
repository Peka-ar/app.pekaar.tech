import React from "react";
import { Role, requirePrincipalOrRedirect } from "@/server/auth-guards";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdminLayout from "@/components/admin/AdminLayout";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const principal = await requirePrincipalOrRedirect();

  if (principal.role === Role.ADMIN) {
    return (
      <AdminLayout
        title="Notifications"
        user={{
          name: principal.companyName,
          email: principal.email,
          role: principal.role,
        }}
      >
        {children}
      </AdminLayout>
    );
  }

  return <DashboardLayout title="Notifications">{children}</DashboardLayout>;
}
