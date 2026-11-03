# Updating from Microsoft upstream

Upstream repository:
https://github.com/microsoft/power-platform-skills

## Automated synchronization

`.github/workflows/sync-upstream.yml` runs every Monday and can also be started
manually from GitHub Actions.

The workflow:

1. checks out `microsoft/power-platform-skills@main` and
   `microsoft/Dataverse-skills@main`, synchronizing Dataverse first;
2. copies upstream additions, changes, and deletions into the ten mapped
   plugins;
3. preserves every `.codex-plugin/plugin.json`;
4. reapplies the FlowAgent Node.js 22 launcher fix;
5. normalizes Codex-incompatible mobile MCP metadata and skill frontmatter;
6. removes production telemetry routing and restores the hard-off;
7. refreshes plugin versions, skill counts, and upstream commit metadata;
8. runs `npm test`;
9. creates or updates
   `automation/sync-microsoft-power-platform-skills` as a pull request against
   `main`;
10. squash-merges that pull request after the synchronization validation has
    passed.

The Action never pushes upstream changes directly to `main`. The generated pull
request provides an audit trail and is merged automatically only after the sync
job has successfully run `npm test`. A failed synchronization remains unmerged.

## Manual synchronization

Clone both Microsoft upstream repositories separately. Synchronize Dataverse first,
then the Power Platform plugins (the second command runs `npm test`):

```bash
node scripts/sync-dataverse.mjs /absolute/path/to/Dataverse-skills \
  "$(git -C /absolute/path/to/Dataverse-skills rev-parse HEAD)"
```

Then run:

```bash
npm run sync:upstream -- /absolute/path/to/power-platform-skills \
  "$(git -C /absolute/path/to/power-platform-skills rev-parse HEAD)"
```

The sync command runs `npm test`. Review the diff before committing.

To update only Power Automate while another upstream plugin is awaiting
mapping review, pass `power-automate` as the third argument:

```bash
npm run sync:upstream -- /absolute/path/to/power-platform-skills \
  "$(git -C /absolute/path/to/power-platform-skills rev-parse HEAD)" \
  power-automate
```

This imports only `plugins/power-automate`, restores the Codex FlowAgent MCP
launcher and telemetry settings, and reapplies the Dutch flow design guide to
`build-flow` and `create-flow`. It also restores custom connector discovery and
the `build-custom-connector` skill from `config/power-automate-overrides/`.
The selected upstream commit is recorded on the
Power Automate entry in `config/plugin-inventory.json`. The repository-wide
commit in `.upstream/power-platform-skills.json` still identifies the last
complete marketplace sync.

## Mapping and preservation rules

The renamed Codex destinations are:

- upstream `plugins/code-apps` → `plugins/code-apps-preview`
- upstream `plugins/mobile-apps` → `plugins/mobile-app`

The synchronization scripts preserve or regenerate:

- every `.codex-plugin/plugin.json`;
- `.agents/plugins/marketplace.json`, including the three newly mapped plugins
  (`pcf`, `power-apps-mobile-extension`, and `process-intelligence`);
- `globalThis.require=require` in `plugins/power-automate/.mcp.json`;
- valid YAML frontmatter in
  `plugins/mobile-app/skills/add-sample-data/SKILL.md`;
- `"disabled": true` and no production routing values in every
  `plugins/**/telemetry/ikey.json` file;
- `config/plugin-inventory.json`;
- `.upstream/power-platform-skills.json`;
- README skill counts.
- the Power Automate flow design rules from
  `config/power-automate-flow-design.md` and the custom connector overlays from
  `config/power-automate-overrides/`.

If Microsoft adds or removes a marketplace plugin, synchronization fails
intentionally. Review that plugin and extend both mappings before accepting it. The known
external `dataverse` entry is checked against its exact source in
`microsoft/Dataverse-skills`, then bundled locally by a separate synchronizer.
A changed remote source also fails synchronization.

## Telemetry rule

Do not copy upstream production telemetry instrumentation keys or collector URLs
into this repository. The Codex distribution intentionally ships with telemetry
hard-disabled.

## Dataverse synchronization

`node scripts/sync-dataverse.mjs <Dataverse-skills-checkout> <40-char-commit>`
imports `.github/plugins/dataverse` into `plugins/dataverse`, including its
native Codex manifest, assets, helper scripts and skills. It preserves the
upstream license, adds a Codex version suffix and refreshes both marketplaces,
the inventory and README counts. Run `npm test` after a standalone Dataverse sync.

`.upstream/dataverse-skills.json` and the Dataverse inventory entry record the
independent source commit. A Power Platform sync retains that entry; the weekly
workflow updates both repositories before validation. The generated PR records
both source commits. Dataverse connection/auth setup remains environment-specific
and is performed by `dv-connect`; the distribution ships no environment URL or
credentials.

## Portable packages and icons

`scripts/plugin-package.mjs` writes root Agent Plugins 1.0 manifests from each
Codex compatibility manifest. It runs after the host-specific adaptations, both
for full/Power Automate syncs and standalone Dataverse syncs. Versions, metadata
and OpenAI presentation are identical across the two formats. Portable MCP
configuration comes from the adapted Codex server map with explicit `stdio` or
`streamable-http` transport types; FlowAgent retains its bootstrap and telemetry
environment.

The Dataverse root manifest is intentionally replaced: its upstream root uses an
Antigravity schema, which conflicts with Codex portable discovery. Process
Intelligence's portable manifest is regenerated so it shares the Codex version.
Existing Dataverse artwork is preserved. Other plugins include the original
project icon from `config/plugin-icon.svg` under their own assets directory.
The icon and presentation settings are restored on every sync.
