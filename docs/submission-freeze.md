# Release freeze

Finish reviewed merges and any intended release before 2026-10-23 at 12:00
Pacific time (19:00 UTC). Keep source, tags and package releases unchanged
through the winner announcement on 2026-12-03.

Merge the Dependabot configuration with the final reviewed changes. It pauses
version-update PRs and automatic rebases for both configured ecosystems. Close
remaining Dependabot PRs before the deadline because existing PRs can still
receive updates. Security-update PRs require a separate repository setting:

```sh
gh api --method DELETE repos/aalvaropc/mcp-apps-web-host/automated-security-fixes
gh api --include repos/aalvaropc/mcp-apps-web-host/automated-security-fixes
gh api --include repos/aalvaropc/mcp-apps-web-host/vulnerability-alerts
```

The setting change returns HTTP 204; its check returns HTTP 404 when disabled.
Vulnerability alerts must remain enabled (HTTP 204). A 403 is a permission
error. Check GitHub's repository security settings when a status is ambiguous.
Keep security alerts, secret scanning and read-only CI checks enabled. Record
the setting results and the final main SHA privately before the deadline.
This configuration does not execute the commands or publish the package.

After the winner announcement, restore both version-update limits to 5,
remove `rebase-strategy: disabled`, and re-enable automatic security fixes:

```sh
gh api --method PUT repos/aalvaropc/mcp-apps-web-host/automated-security-fixes
gh api --include repos/aalvaropc/mcp-apps-web-host/automated-security-fixes
```

The setting change returns HTTP 204; its check must return HTTP 200 with
`enabled: true` and `paused: false`. Review accumulated alerts before the
next release. Do not automatically resume on November 20.

References: [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
and [repository security settings API](https://docs.github.com/en/rest/repos/repos#disable-dependabot-security-updates).
