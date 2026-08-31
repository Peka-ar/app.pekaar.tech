import { Client } from "node-appwrite";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "./appwrite-config";

// On Appwrite Sites, injected APPWRITE_* env vars take precedence and user-set
// APPWRITE_-prefixed keys are disallowed — so the server key is stored under
// STUDIOV_API_KEY there. Everywhere else (.env local, Vercel) APPWRITE_API_KEY applies.
export const APPWRITE_API_KEY = process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!;

export { APPWRITE_DATABASE_ID, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_USERS_TABLE_ID, SESSION_COOKIE } from "./appwrite-config";

const globalForAppwrite = globalThis as unknown as { adminClient?: Client };

export function createAdminClient(): Client {
  if (!globalForAppwrite.adminClient) {
    globalForAppwrite.adminClient = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
  }
  return globalForAppwrite.adminClient;
}

export function createSessionClient(secret: string, userAgent?: string): Client {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setSession(secret);
  if (userAgent) {
    client.setForwardedUserAgent(userAgent);
  }
  return client;
}

export function createPublicClient(): Client {
  return new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}