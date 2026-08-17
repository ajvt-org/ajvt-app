import { defineConfig, devices } from "@playwright/test";
import { localDatabase } from "./tests/localDatabase";

const DATABASE_URL = process.env.E2E_DATABASE_URL ?? localDatabase("ajvt_e2e");
const PORT = 3100;
const PRODUCTION = process.env.E2E_PRODUCTION === "1";

process.env.E2E_DATABASE_URL = DATABASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: PRODUCTION ? `npx next start --port ${PORT}` : `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET ?? "e2e-secret-not-a-real-one",
      NODE_ENV: PRODUCTION ? "production" : "development",
    },
  },
});
