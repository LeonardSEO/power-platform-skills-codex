# Updating from Microsoft upstream

Upstream repository:
https://github.com/microsoft/power-platform-skills

## Automated synchronization

`.github/workflows/sync-upstream.yml` runs every Monday and can also be started
manually from GitHub Actions.

The workflow:

1. checks out `microsoft/power-platform-skills@main`;
2. copies upstream additions, changes, and deletions into the seven mapped
   plugins;
3. preserves every `.codex-plugin/plugin.json`;
4. reapplies the FlowAgent Node.js 22 launcher fix;
5. normalizes Codex-incompatible mobile MCP metadata and skill frontmatter;
6. removes production telemetry routing and restores the hard-off;
7. refreshes plugin versions, skill counts, and upstream commit metadata;
8. runs `npm test`;
9. creates or updates
   `automation/sync-microsoft-power-platform-skills` as a pull request against
   `main`.

The Action never commits upstream changes directly to `main`. Review and merge
the generated pull request after its validation checks pass.

## Manual synchronization

Clone or check out Microsoft upstream separately, then run:

```bash
npm run sync:upstream -- /absolute/path/to/power-platform-skills \
  "$(git -C /absolute/path/to/power-platform-skills rev-parse HEAD)"
```

Review the diff and run `npm test` before committing.

## Mapping and preservation rules

The renamed Codex destinations are:

- upstream `plugins/code-apps` → `plugins/code-apps-preview`
- upstream `plugins/mobile-apps` → `plugins/mobile-app`

The synchronization scripts preserve or regenerate:

- every `.codex-plugin/plugin.json`;
- `.agents/plugins/marketplace.json`;
- `globalThis.require=require` in `plugins/power-automate/.mcp.json`;
- valid YAML frontmatter in
  `plugins/mobile-app/skills/add-sample-data/SKILL.md`;
- `"disabled": true` and no production routing values in
  `plugins/power-pages/scripts/lib/telemetry/ikey.json`;
- `config/plugin-inventory.json`;
- `.upstream/power-platform-skills.json`;
- README skill counts.

If Microsoft adds or removes a marketplace plugin, synchronization fails
intentionally. Review that plugin and extend both mappings before accepting it.

## Telemetry rule

Do not copy upstream production telemetry instrumentation keys or collector URLs
into this repository. The Codex distribution intentionally ships with telemetry
hard-disabled.
