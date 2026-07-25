import TasksClient from "./TasksClient";
import { getUserProjects } from "@/app/actions/project";
import { getAllTasks } from "@/app/actions/admin";
import { Role } from "@/generated/prisma/client";
import { requirePrincipalOrRedirect } from "@/lib/auth-guards";

import { Suspense } from 'react';

export default async function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Loading Tasks...</p>
        </div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}

async function TasksContent() {
  const principal = await requirePrincipalOrRedirect();
  let jobs: Awaited<ReturnType<typeof getUserProjects>> = [];
  try {
    if (principal.role === Role.ADMIN) {
      jobs = await getAllTasks();
    } else {
      jobs = await getUserProjects();
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  return <TasksClient initialJobs={jobs} role={principal.role} />;
}
