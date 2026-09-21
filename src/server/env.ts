import { z } from "zod";

const EnvSchema = z.object({
  APPWRITE_ENDPOINT: z.string().url(),
  APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  // Fast (AI draft) generation — Hunyuan3D Modal HTTP API. Optional so local
  // dev / tests run without them; Fast mode surfaces a clear error when unset.
  HY3D_API_URL: z.string().url().optional(),
  HY3D_API_URL_2: z.string().url().optional(),
  HY3D_API_TOKEN: z.string().min(1).optional(),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse({
    APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY: process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY,
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME,
    CRON_SECRET: process.env.CRON_SECRET,
    HY3D_API_URL: process.env.HY3D_API_URL,
    HY3D_API_URL_2: process.env.HY3D_API_URL_2,
    HY3D_API_TOKEN: process.env.HY3D_API_TOKEN,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment. ${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
