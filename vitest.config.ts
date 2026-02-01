import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".astro"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/services/**/*.ts", "src/lib/utils/**/*.ts", "src/lib/schemas/**/*.ts"],
      exclude: ["src/lib/services/**/index.ts", "**/*.d.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
