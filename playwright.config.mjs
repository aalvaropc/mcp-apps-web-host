import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  use: { browserName: "chromium", headless: true, baseURL: "http://127.0.0.1:8190" },
  webServer: {
    command: "node example/server.mjs",
    env: { PAGE_PORT: "8190", SANDBOX_PORT: "8191" },
    // The sandbox starts after the page, so wait for its answer: both origins are up once it is served.
    url: "http://127.0.0.1:8191/mcp-app/sandbox.html",
    reuseExistingServer: false,
  },
});
