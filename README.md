# mcp-apps-web-host

A dependency-free host bridge for [MCP Apps](https://modelcontextprotocol.io/)
(extension `2026-01-26`) in a web page: it loads a tool's `ui://` view through a
sandbox proxy on a **second origin**, runs the handshake, forwards the tool input
and result, relays host context changes, clamps size changes, routes `ui/message`
to your handler and tears the view down cleanly. One ES module for the page
(`src/host.js`, 124 lines) and one static page for the sandbox origin
(`sandbox/sandbox.html`, 91 lines). No build step, no dependencies.

It was extracted from [LogiOps AI](https://github.com/aalvaropc/logiops-ai), where
it renders an interactive plan-comparison card inside a simulated Alexa+ device;
the two files there are byte-identical to these.

## Why a second origin

An MCP App view is HTML served by an MCP server you may not control. If the page
that hosts it loads it into an iframe on its own origin, the view can read the
page's storage, cookies and DOM. The MCP Apps spec therefore has hosts load views
through a *sandbox proxy* on a different origin: the page talks only to the proxy
(`postMessage` with an explicit target origin), the proxy puts the view's HTML in an
inner iframe with a `sandbox` attribute and a Content-Security-Policy, and messages
cross the two boundaries by JSON-RPC over `postMessage`.

```text
  page origin (your app)                    sandbox origin (static page only)
  ┌────────────────────────┐   postMessage   ┌──────────────────────────────┐
  │ createMcpAppHost(...)  │ ──────────────► │ sandbox.html?host=<page>     │
  │  - reads ui:// via MCP │ ◄────────────── │   inner <iframe sandbox>     │
  │  - handshake, context  │                 │   srcdoc = CSP + view HTML   │
  │  - ui/message handler  │                 │   forwards JSON-RPC both ways│
  └────────────────────────┘                 └──────────────────────────────┘
```

## Use

Serve `sandbox/sandbox.html` from the sandbox origin **only** (it must never be
served with data; the page's own origin must answer 404 for it). Locally,
`127.0.0.1` and `localhost` are two origins on the same server, so each can
sandbox the other; in production use a second hostname (LogiOps uses a second
CloudFront distribution). Serve it with
`Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors <page origin>`
and `Referrer-Policy: no-referrer`.

```js
import { createMcpAppHost } from "./host.js";

const host = createMcpAppHost({
  sandboxOrigin: "https://sandbox.example.com",   // null disables views entirely
  hostOrigin: location.origin,
  proxyPath: "/mcp-app/sandbox.html",
  slot: document.getElementById("mcp-app-slot"),   // the iframe goes here
  mcp: { request: (method, params) => mcpClient.request(method, params) },  // tools/list, resources/read
  uriPrefix: "ui://my-server/",                    // only views under this prefix are loaded
  hostInfo: { name: "My host", version: "1.0.0" },
  hostContext: () => ({ theme: "dark", displayMode: "inline", containerDimensions: { width: 600, maxHeight: 640 } }),
  onMessage: (params) => handleViewMessage(params), // true = accepted, false = -32000 with rejectMessage
  onHide: (reason) => { /* the frame is gone */ },
  rejectMessage: "Unknown or unavailable plan",
  frameTitle: "Resolution options (MCP App)",
  minHeight: 80, maxHeight: 640, teardownTimeout: 500,
});

const resource = await host.show({
  toolName: "investigate_incident",
  input: { shipment_id: "SHIP-421" },
  result: toolResult,                              // the MCP tool result (content, structuredContent, _meta)
  stillWanted: () => !userMovedOn,                 // checked after the resource is read
});
// resource: { uri, html, csp, prefersBorder, invoking, invoked } or null when nothing was shown

host.notifyContext();        // after a theme or size change
await host.hide("replaced"); // ui/resource-teardown, then the frame is removed
host.destroy();
```

`show` reads the tool's `_meta.ui.resourceUri` from `tools/list`, reads the
resource once (cached per tool) and accepts it only when its MIME type is
`text/html;profile=mcp-app`. A show that is superseded by another show, or whose
`stillWanted()` turns false, shows nothing.

## Security model

**Page side (`src/host.js`):**

- Every message is accepted only if `event.source` is the proxy frame's window
  **and** `event.origin === sandboxOrigin`; everything the host posts names
  `sandboxOrigin` as the target.
- The iframe gets `sandbox="allow-scripts allow-same-origin"` (same-origin with the
  sandbox origin, never with the page) and `referrerpolicy="no-referrer"`; the host
  never uses `srcdoc`, so the view's HTML never runs on the page's origin.
- Views only ever receive: the `ui/initialize` result (protocol, host info, empty
  host capabilities, your host context), `tool-input`, `tool-result` and
  `host-context-changed`. Unknown requests get `-32601`.
- `ui/message` is the only way a view influences the page, through your handler,
  which decides and answers `{}` or `-32000`.
- Size changes are clamped to `[minHeight, maxHeight]`.
- A generation counter makes stale `show`s harmless; teardown sends
  `ui/resource-teardown` and removes the frame on the reply or after
  `teardownTimeout`.

**Sandbox side (`sandbox/sandbox.html`):**

- Runs only when `?host=` is an `http(s)` origin different from its own, the page
  is framed, and `ancestorOrigins[0]` (when available) equals that host; otherwise it
  does nothing.
- Only forwards messages from the parent when `event.origin === host`, and only
  forwards the view's messages to that host; proxy-level methods
  (`ui/notifications/sandbox-*`) are never forwarded in either direction, so a view
  cannot spoof `sandbox-resource-ready` or `sandbox-view-removed`.
- The view's `sandbox` tokens are filtered through an allowlist
  (`allow-scripts allow-forms allow-popups allow-modals`; never
  `allow-same-origin` or `allow-top-navigation`).
- The view is loaded with `srcdoc` under a CSP built from the resource's
  `_meta.ui.csp` (`connectDomains`, `resourceDomains`, `frameDomains`,
  `baseUriDomains`, each limited to `https://` origins), with `default-src 'none'`,
  `object-src 'none'` and `form-action 'none'`.
- If the view navigates away, the proxy removes it and tells the host
  (`ui/notifications/sandbox-view-removed`), which tears down.

## Tests

`npm test` runs the `node:test` suite against a fake window: the resource is read
once and the frame is built right; non-MCP-App resources and stale shows are not
shown; the handshake; other origins and windows are ignored and unknown methods get
`-32601`; size clamping and `ui/message` routing; host context only after
`initialized`; teardown with reply, without a view, and on timeout; a view that
navigates away. A cross-origin browser test (`127.0.0.1` page, `localhost` proxy)
runs in LogiOps AI's Playwright suite.

## License

MIT.
