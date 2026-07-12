import TasksClient from "./TasksClient";
import { getUserProjects } from "@/app/actions/project";
import { getAllTasks } from "@/app/actions/admin";
import { auth } from "@/auth";

import { Suspense } from 'react';

export default async function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#F9F8F6]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-mono text-[#7A7670] uppercase tracking-widest">Loading Tasks...</p>
        </div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}

async function TasksContent() {
  const session = await auth();
  const role = (session?.user as any)?.role || "BRAND";
  
  let jobs: any[] = [];
  try {
    if (role === "ADMIN") {
      jobs = await getAllTasks();
    } else {
      jobs = await getUserProjects();
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  return <TasksClient initialJobs={jobs} role={role} />;
}
