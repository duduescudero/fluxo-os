import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.FLOW_BASE_URL ?? "http://127.0.0.1:5173",
    channel: process.env.PW_CHANNEL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  timeout: 30000,
});
