import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "mcp-host-consumer-"));
try {
  const [packed] = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: root, encoding: "utf8" }));
  assert.ok(packed.files.some((file) => file.path === "types/host.d.ts"));
  assert.ok(!packed.files.some((file) => file.path.startsWith("node_modules/") || file.path.startsWith("test/")));
  writeFileSync(join(temporary, "package.json"), JSON.stringify({ private: true, type: "module" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(temporary, packed.filename)], { cwd: temporary, stdio: "pipe" });
  execFileSync(process.execPath, ["--input-type=module", "-e", "import { createMcpAppHost } from 'mcp-apps-web-host'; import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); if (typeof createMcpAppHost !== 'function' || !require.resolve('mcp-apps-web-host/sandbox.html')) process.exit(1);"], { cwd: temporary, stdio: "pipe" });
  writeFileSync(join(temporary, "consumer.ts"), "import { createMcpAppHost, type McpAppHost } from 'mcp-apps-web-host'; const host: McpAppHost = createMcpAppHost({ sandboxOrigin: null, hostOrigin: 'http://localhost', slot: document.createElement('div'), mcp: { request: async () => ({}) } }); void host;\n");
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict", "--module", "esnext", "--moduleResolution", "bundler", "--target", "es2022", "consumer.ts"], { cwd: temporary, stdio: "pipe" });
  console.log("Packed package imports, exported assets, and consumer types passed");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
