import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  use: { headless: true, baseURL: "http://127.0.0.1:8190" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "node example/server.mjs",
    env: { PAGE_PORT: "8190", SANDBOX_PORT: "8191" },
    url: "http://127.0.0.1:8191/mcp-app/sandbox.html",
    reuseExistingServer: false,
  },
});
