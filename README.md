# mcp-apps-web-host

Show [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) views in a web
page without giving them your page's origin. One ES module for the page and one
static page for a sandbox origin; no dependencies, no build step.

It loads a tool's `ui://` view through a sandbox proxy on a **second origin**,
runs the handshake, forwards the tool input, result and host context, routes
`ui/message` to your handler, and tears the view down cleanly. It implements MCP
Apps `2026-01-26`
([specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)),
and was extracted from [LogiOps AI](https://github.com/aalvaropc/logiops-ai),
where the same two files render a plan-comparison card.

## Install

```sh
npm install mcp-apps-web-host
```

TypeScript declarations ship with the package. Serve the sandbox page (`mcp-apps-web-host/sandbox.html`, in the package at
`sandbox/sandbox.html`) as a static file from the sandbox origin. Without npm,
copy `src/host.js` and `sandbox/sandbox.html`.

## Use

```js
import { createMcpAppHost } from "mcp-apps-web-host";

const host = createMcpAppHost({
  sandboxOrigin: "https://sandbox.example.com",   // null disables views entirely
  hostOrigin: location.origin,
  slot: document.getElementById("mcp-app-slot"),   // the iframe goes here
  mcp: { request: (method, params) => mcpClient.request(method, params) },  // tools/list, resources/read
  uriPrefix: "ui://my-server/",                    // only views under this prefix are loaded
  hostInfo: { name: "My host", version: "1.0.0" },
  hostContext: () => ({ theme: "dark", displayMode: "inline" }),
  onMessage: async (params) => handleViewMessage(params), // true accepts; false, a throw or a rejection refuses
});

await host.show({ toolName: "compare_options", input, result: toolResult });
host.notifyContext();        // after a theme or size change
await host.hide("replaced"); // ui/resource-teardown, then the frame is removed
```

`show` finds the tool's `_meta.ui.resourceUri`, reads the resource once, and
shows it only if its MIME type is `text/html;profile=mcp-app`. It returns the
resource, or `null` when nothing was shown: a show that a newer one supersedes,
or whose optional `stillWanted()` turns false, shows nothing. Other options:
`onHide`, `rejectMessage`, `frameTitle`, `frameId`, `proxyPath`, `minHeight`,
`maxHeight`, `teardownTimeout`, `readyTimeout`, `onReady`, `onError`, `mime`, `protocol` and `window`. The host also
has `loadResource(toolName)` to prefetch, `isShowing()`, `ready()` and
`destroy()`.

`show()` resolves when the iframe is mounted. Keep a fallback visible until
`onReady(resource)` fires, after the view initializes and receives its tool data.
`onError(error)` reports iframe load failures or initialization exceeding
`readyTimeout` (5000 ms by default), and the failed iframe is removed. Hiding,
replacing, or destroying a view cancels its pending readiness timer.
Tool discovery follows every `nextCursor`; missing or invalid resources are
retried on the next request, while successful reads stay cached.

## Serve the sandbox page

Serve `sandbox.html` from the sandbox origin **only**; the page's own origin must
answer 404 for it. Locally, two ports or `127.0.0.1` and `localhost` are two
origins; in production, use a second hostname. Send:

```text
Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors <page origin>
Referrer-Policy: no-referrer
```

This header caps what any view can ask for in its `_meta.ui.csp`: with it, a view
can inline scripts, styles, images and fonts, and cannot load or fetch anything.
To let views reach an API, add its origin to `connect-src` here as well.

## Why a second origin

A view is HTML from an MCP server you may not control. In an iframe on your own
origin it could read your page's storage, cookies and DOM. So the page talks only
to a proxy on another origin, the proxy runs the view in a sandboxed inner
iframe under a CSP, and messages cross both boundaries as JSON-RPC over
`postMessage`.

```text
  page origin (your app)                    sandbox origin (static page only)
  ┌────────────────────────┐   postMessage   ┌──────────────────────────────┐
  │ createMcpAppHost(...)  │ ──────────────► │ sandbox.html?host=<page>     │
  │  - reads ui:// via MCP │ ◄────────────── │   inner <iframe sandbox>     │
  │  - handshake, context  │                 │   srcdoc = CSP + view HTML   │
  │  - ui/message handler  │                 │   forwards JSON-RPC both ways│
  └────────────────────────┘                 └──────────────────────────────┘
```

## Security model

- **Origins.** The host accepts a message only from the proxy frame's window
  **and** the sandbox origin, and names that origin on everything it posts. The
  proxy runs only when it is framed and `?host=` names another origin (checked
  against `ancestorOrigins` where the browser has it), and forwards only between
  that host and the current view.
- **No spoofing.** Proxy-level messages (`ui/notifications/sandbox-*`) never cross
  the proxy in either direction.
- **Sandbox.** The view's `sandbox` tokens are filtered through an allowlist that
  never includes `allow-same-origin` or `allow-top-navigation`, and its CSP is
  built only from the `https://` origins in `_meta.ui.csp`.
- **Narrow surface.** Views receive only the `ui/initialize` result,
  `tool-input`, `tool-result` and `host-context-changed`; other requests get
  `-32601`. `ui/message` is their only way to affect the page, through your
  handler. Size changes are clamped.
- **Clean teardown.** Hiding sends `ui/resource-teardown` and removes the frame on
  the reply or after a timeout; a view that navigates away is removed and
  reported. Answers meant for a replaced view are dropped.

## Try it

```sh
npm run example
```

Opens a page on `http://127.0.0.1:8000` and the sandbox on
`http://127.0.0.1:8001`, with a stand-in MCP server that has one tool and one
view. Call the tool, switch the theme, pick an option (the page accepts two of
the three) and hide the view; the page logs what it saw.

## Tests

`npm test` runs two `node:test` suites with no browser: the host against a fake
window, and the sandbox page's script in `node:vm`. LogiOps AI's Playwright
suite runs the same two files across two real origins.

## License

MIT. Changes are in [CHANGELOG.md](CHANGELOG.md); how to contribute, in [CONTRIBUTING.md](CONTRIBUTING.md).
