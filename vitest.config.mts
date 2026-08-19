import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    // Measured over src/lib, which is what this suite tests. Components and screens
    // belong to the UI suite, and counting them here would report a number that
    // no test in this file could ever move.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage/unit",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.ui.test.tsx", "src/generated/**", "**/*.d.ts"],
      // The floor is what was measured when coverage was turned on, rounded
      // down. It is here to stop the number falling, not to demand a number:
      // raising it is a separate piece of work with tests attached.
      thresholds: {
        lines: 47,
        functions: 50,
        branches: 54,
        statements: 48,
      },
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret",
      // Vitest reads .env, CI has none. Without this a unit test that reaches
      // a database passes here and fails there, which is how this was found.
      DATABASE_URL: "",
    },
  },
});
