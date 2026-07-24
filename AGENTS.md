# Repository guidance

This repository is an unofficial Codex adaptation of Microsoft's Power Platform
Skills marketplace.

## Required invariants

- Keep every plugin under `plugins/<plugin-name>`.
- Keep each Codex manifest at
  `plugins/<plugin-name>/.codex-plugin/plugin.json`.
- The plugin folder name and manifest `name` must match.
- Keep `.agents/plugins/marketplace.json` as the repository marketplace.
- Preserve upstream files unless a Codex compatibility change requires an edit.
- Keep Power Pages telemetry hard-disabled.
- Never add real instrumentation keys or collector URLs.
- Preserve `globalThis.require=require` in the Power Automate MCP launcher while
  the bundled ESM server requires CommonJS dynamic imports under Node.js 22.
- Do not commit credentials, auth profiles, environment URLs, or customer data.

## Validation

Run this before declaring work complete:

```bash
npm test
```

When importing a new upstream release, also compare the full source tree and
update `README.md` and `UPSTREAM.md`. Use `scripts/sync-upstream.sh` rather than
copying plugin folders by hand; it refreshes the generated inventory and
reapplies the required Codex compatibility changes.
