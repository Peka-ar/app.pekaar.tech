import AdminTasksClient from "./AdminTasksClient";
import { getAllTasks } from "@/app/actions/admin";
import { Role } from "@/generated/prisma/client";
import { requirePrincipalOrRedirect } from "@/lib/auth-guards";
import AdminLayout from "@/components/admin/AdminLayout";

import { Suspense } from 'react';

export default async function AdminTasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Loading Tasks...</p>
        </div>
      </div>
    }>
      <AdminTasksContent />
    </Suspense>
  );
}

async function AdminTasksContent() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });
  const tasks = await getAllTasks();

  return (
    <AdminLayout
      title="Tasks Management"
      user={{ name: principal.companyName, email: principal.email, role: principal.role }}
    >
      <AdminTasksClient
        initialTasks={tasks}
        principal={{ userId: principal.userId, name: principal.companyName, email: principal.email }}
      />
    </AdminLayout>
  );
}
