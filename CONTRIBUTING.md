# Contributing

Thanks for looking. This is a small library with no dependencies and no build step, so the loop is short.

## Run it

```sh
npm test          # the host against a fake window, and the sandbox page in node:vm
npm run example   # a page on 127.0.0.1:8000 and the sandbox on 127.0.0.1:8001
```

The type declarations in `types/host.d.ts` are checked by `test/types.check.ts`; CI runs it with `tsc`, and so can you: `npx -y -p typescript@5 tsc --noEmit --strict --module esnext --moduleResolution bundler --target es2022 test/types.check.ts`.

## Before a pull request

- Keep `src/host.js` and `sandbox/sandbox.html` free of dependencies and of build steps; they are copied byte for byte into [LogiOps AI](https://github.com/aalvaropc/logiops-ai), which runs them through two real origins in its browser tests.
- Add or change a test for what you change. The host tests use a fake window; the sandbox tests run the page's script in `node:vm`.
- Say in the pull request what changed in the wire behaviour, if anything, and add a line to `CHANGELOG.md`.
- Pull requests go to `main`; CI runs the tests on Node 18, 20, 22 and 24, checks the types and packs the module.

## Reporting a problem

Open an issue with the host you used (browser and version), the view's `_meta.ui` (`csp`, `permissions`, `domain`), what the sandbox page's console printed, and the smallest view HTML that shows the problem. Security problems: open an issue too, without the exploit details, and say it is security-related.

Contributions are accepted under the MIT license.
