import React, { Suspense } from 'react';
import AdminLayout from "@/components/admin/AdminLayout";
import { requirePrincipalOrRedirect } from '@/server/auth-guards';
import { Role } from '@/server/auth-guards';
import { AdminUsersClient } from './AdminUsersClient';
import { Skeleton } from '@/components/ui/Skeleton';

function UserSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}

export default async function AdminUsersPage() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });
  return (
      <AdminLayout title="Users" user={{ name: principal.companyName, email: principal.email, role: principal.role }}>
      <Suspense fallback={<UserSkeleton />}>
        <AdminUsersClient />
      </Suspense>
    </AdminLayout>
  );
}
