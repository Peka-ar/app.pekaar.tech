"use client";

import { AppwriteProvider } from "@appwrite.io/react";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/lib/appwrite-config";

export function Providers({
  session,
  children,
}: {
  session?: string | null;
  children: React.ReactNode;
}) {
  return (
    <AppwriteProvider
      endpoint={APPWRITE_ENDPOINT}
      projectId={APPWRITE_PROJECT_ID}
      ssr={{ session, basePath: "/api/appwrite" }}
    >
      {children}
    </AppwriteProvider>
  );
}
