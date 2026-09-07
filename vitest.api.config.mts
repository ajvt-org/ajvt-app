import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { API_TEST_WORKERS, localDatabase } from "./tests/localDatabase.mjs";

const BASE_DATABASE_URL = process.env.TEST_DATABASE_URL ?? localDatabase("ajvt_test");

process.env.TEST_DATABASE_BASE_URL = BASE_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.ts"],
    setupFiles: ["tests/api/setup.ts"],
    globalSetup: ["tests/api/globalSetup.ts"],
    maxWorkers: API_TEST_WORKERS,
    testTimeout: 20000,
    env: {
      TEST_DATABASE_BASE_URL: BASE_DATABASE_URL,
      JWT_SECRET: "test-secret",
      NODE_ENV: "test",
    },
  },
});
