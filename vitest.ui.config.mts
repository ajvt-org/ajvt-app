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
    // Measured over the components and screens, which is what this suite renders.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage/ui",
      include: ["src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.ui.test.tsx", "src/generated/**", "**/*.d.ts"],
      // The floor is what was measured when coverage was turned on, rounded
      // down. It is here to stop the number falling, not to demand a number:
      // raising it is a separate piece of work with tests attached.
      thresholds: {
        lines: 21,
        functions: 19,
        branches: 19,
        statements: 20,
      },
    },
    environment: "jsdom",
    include: ["src/**/*.ui.test.tsx"],
    setupFiles: ["tests/ui/setup.ts"],
    globals: true,
  },
});
