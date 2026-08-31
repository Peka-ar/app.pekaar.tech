import { createAppwriteHandlers } from "@appwrite.io/react/handlers/next";
import { APPWRITE_API_KEY } from "@/lib/appwrite";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/lib/appwrite-config";

export const { GET, POST } = createAppwriteHandlers({
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  apiKey: APPWRITE_API_KEY,
  basePath: "/api/appwrite",
  redirects: { success: "/dashboard", failure: "/auth" },
});