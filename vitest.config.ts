import { defineConfig } from "vitest/config";

/** `pnpm test` は unit だけ。e2e は Dev Hub で実 Scratch Org を作るので `pnpm test:e2e` で明示的に走らせる。 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.test.ts"],
          globalSetup: ["tests/e2e/global-setup.ts"],
          testTimeout: 300_000,
        },
      },
    ],
  },
});
