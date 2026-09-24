import TasksClient from "./TasksClient";
import { getUserProjects } from "@/app/actions/project";
import { getAllTasks } from "@/app/actions/admin";
import { Role } from "@/server/auth-guards";
import { requirePrincipalOrRedirect } from "@/server/auth-guards";

import { Suspense } from 'react';

// Server actions posted to this segment run pollAndFinalize (download +
// upload of a ~17MB GLB, 60s+ typical) — match the generation API route budget.
export const maxDuration = 300;

export default async function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-sans text-[var(--color-text-muted)] uppercase tracking-widest">Loading Tasks...</p>
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

  // Flag non-terminal AI-pipeline tasks so the client auto-checks them once
  // on mount (no calls at all when nothing is active).
  const ACTIVE_GEN = new Set(["SUBMITTED", "RUNNING", "FINALIZING"]);
  const autoPoll = jobs.some(
    (j) => j.generationMode === "FAST" && ACTIVE_GEN.has(j.generationStatus ?? ""),
  );

  return <TasksClient initialJobs={jobs} role={principal.role} autoPoll={autoPoll} />;
}
