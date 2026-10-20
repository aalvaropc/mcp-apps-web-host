# Changelog

## 1.1.0

- `onMessage` may return a promise. The view gets its answer once the promise settles; a handler that throws or rejects is a refusal (`-32000`), and an answer for a view that was replaced or hidden in the meantime is dropped.
- The default `hostInfo.version` is `1.1.0`.
- The package exports `mcp-apps-web-host/sandbox.html` and `mcp-apps-web-host/package.json`, and declares its repository, author and Node 18+.
- `example/` runs the page and the sandbox on two local origins with a stand-in MCP server (`npm run example`).
- The sandbox page has its own test suite, run in `node:vm`: origin checks, the sandbox token allowlist, the view's CSP, message forwarding and navigation.
- The README's recommended CSP for the sandbox page includes `font-src data:`, and explains that this outer policy caps what any view's `_meta.ui.csp` can ask for.

## 1.0.1

- `sandbox.html` declares `color-scheme: dark light`, so a dark view does not flash white while it loads.
- The view's Content-Security-Policy allows `font-src data:`, so a view may inline its own font.

## 1.0.0

- First release: `createMcpAppHost` for the page and `sandbox.html` for the sandbox origin.
