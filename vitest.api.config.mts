import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { localDatabase } from "./tests/localDatabase.mjs";

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? localDatabase("ajvt_test");

process.env.DATABASE_URL = DATABASE_URL;

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
    fileParallelism: false,
    env: {
      DATABASE_URL,
      JWT_SECRET: "test-secret",
      NODE_ENV: "test",
    },
  },
});
