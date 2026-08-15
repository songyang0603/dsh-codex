import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.spec.ts"],
    pool: "forks",
    testTimeout: 30_000,
  },
});
