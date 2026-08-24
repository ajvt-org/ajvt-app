import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { DATABASE_BOUND_LIB } from "./tests/coverageScope.mjs";

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
    // no test in this file could ever move. The same goes for the modules bound
    // to prisma: the api suite exercises those, so counting them here reported a
    // floor that pure code could not lift and that shifted when logic moved
    // between the two. coverageScope.test.ts keeps that list honest.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage/unit",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.ui.test.tsx",
        "src/generated/**",
        "**/*.d.ts",
        ...DATABASE_BOUND_LIB,
      ],
      // The floor is what pure src/lib actually reaches, rounded down. It is
      // here to stop the number falling, not to demand a number.
      thresholds: {
        lines: 74,
        functions: 78,
        branches: 75,
        statements: 74,
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
