import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const isCi = process.env["CI"] !== undefined;
const baseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 1 : "50%",
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort",
    url: `${baseUrl}/tests/browser/indexeddb.html`,
    reuseExistingServer: !isCi,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
