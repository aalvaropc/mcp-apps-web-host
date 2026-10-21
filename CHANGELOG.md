# Changelog

## 1.3.0

- `onReady(resource)` fires once after initialization and tool delivery. `onError(error)` reports iframe load errors and initialization timeouts (`readyTimeout`, default 5000 ms).
- Pending readiness timers are cancelled when a view is hidden, replaced, or destroyed. `show()` still resolves after the iframe is mounted.
- Tool discovery follows `nextCursor`, rejects cursor cycles, and retries missing or invalid resources on subsequent calls.

## 1.2.0

- TypeScript declarations ship in the package (`types/host.d.ts`): the options, the host object, the view resource and the two constants. `test/types.check.ts` keeps them honest in CI.
- `CONTRIBUTING.md`: how to run the tests and the example, what a pull request needs, and how to report a problem.
- The code is the same as 1.1.0.

## 1.1.1

- Documentation only: a shorter README and a one-line package description. The code is the same as 1.1.0.

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
