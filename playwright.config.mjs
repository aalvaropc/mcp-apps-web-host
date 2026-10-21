import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  use: { browserName: "chromium", headless: true, baseURL: "http://127.0.0.1:8190" },
  webServer: {
    command: "node example/server.mjs",
    env: { PAGE_PORT: "8190", SANDBOX_PORT: "8191" },
    url: "http://127.0.0.1:8190",
    reuseExistingServer: false,
  },
});
