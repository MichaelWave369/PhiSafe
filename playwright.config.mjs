import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  timeout: 30_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", {open:"never", outputFolder:"playwright-report"}]],
  use: {
    baseURL:"http://127.0.0.1:4173",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    serviceWorkers:"allow"
  },
  projects: [
    {name:"desktop-chromium", use:{...devices["Desktop Chrome"]}},
    {name:"mobile-chromium", use:{...devices["Pixel 7"]}}
  ],
  webServer: {
    command:"node tests/browser/serve.mjs",
    url:"http://127.0.0.1:4173",
    reuseExistingServer:!process.env.CI,
    timeout:20_000
  },
  outputDir:"test-results"
});
