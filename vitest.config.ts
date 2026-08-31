import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/server/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://test.appwrite.test/v1",
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
      STUDIOV_API_KEY: "test-api-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
