import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", workers: 1, timeout: 120000,
  use: { baseURL: "http://localhost:3100", channel: process.platform === "win32" ? "msedge" : undefined, screenshot: "only-on-failure", trace: "retain-on-failure" },
  reporter: "list"
});
