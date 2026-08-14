import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://ajvt:ajvt@localhost:5433/ajvt_test";

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
