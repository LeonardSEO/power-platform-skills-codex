# Power Platform Skills for Codex

[![Validate](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/validate.yml/badge.svg)](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/validate.yml)
[![Sync Microsoft upstream](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/sync-upstream.yml)

An unofficial Codex adaptation of Microsoft's
[`power-platform-skills`](https://github.com/microsoft/power-platform-skills)
marketplace.

The upstream project targets Claude Code and GitHub Copilot CLI. This repository
adds Codex-native plugin manifests and a Codex marketplace while preserving the
upstream skills, scripts, templates, references, and MCP servers.

## Included plugins

| Plugin | Skills | Purpose |
| --- | ---: | --- |
| `power-pages` | 33 | Build and deploy Power Pages code sites |
| `model-apps` | 4 | Build generative pages for model-driven apps |
| `mcp-apps` | 2 | Generate interactive MCP App widgets |
| `canvas-apps` | 4 | Author Canvas Apps through the Canvas Authoring MCP server |
| `code-apps-preview` | 15 | Build React and Vite Power Apps code apps |
| `mobile-app` | 28 | Build Expo and React Native Power Apps |
| `power-automate` | 10 | Build, edit, publish, run, and debug cloud flows |

Total: **96 Codex skills**.

## Codex-specific changes

- Added `.codex-plugin/plugin.json` to every plugin.
- Added a repository marketplace at `.agents/plugins/marketplace.json`.
- Added Codex-native `.codex.mcp.json` adapters. The upstream `.mcp.json`
  files remain available for Claude Code and GitHub Copilot CLI.
- Added a Node.js 22 compatibility fix to the bundled Power Automate FlowAgent
  launcher.
- Corrected one invalid YAML frontmatter entry in the mobile app skills.
- Hard-disabled Power Pages 1DS telemetry and removed the upstream production
  instrumentation keys from this distribution.
- Added local and CI validation without adding runtime dependencies.

This repository is not an official Microsoft Codex distribution. Microsoft is
the author and copyright holder of the upstream content; see `NOTICE.md` and
`LICENSE`.

## Requirements

- Codex CLI with plugin support
- Node.js 18 or newer
- Power Platform CLI (`pac`) for Power Platform operations
- Azure CLI (`az`) for plugins that authenticate through Azure
- .NET `dnx` for the Canvas Authoring MCP server

Individual plugins can have additional requirements documented in their own
`README.md`, `AGENTS.md`, or setup skill.

## Universal installer (`npx plugins`)

The [Vercel Labs `plugins` CLI](https://github.com/vercel-labs/plugins) installs
complete OpenPlugin repositories into supported coding agents. Its published
targets include Claude Code, Cursor, OpenAI Codex, Grok Build, Kimi Code,
GitHub Copilot CLI, and Visual Studio Code.

Install into all supported agents detected on the machine:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 \
  npx plugins add LeonardSEO/power-platform-skills-codex
```

Install into Codex only:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 \
  npx plugins add LeonardSEO/power-platform-skills-codex --target codex
```

This repository has been tested with `npx plugins discover`: all seven plugins
are detected, including their skills, agents, hooks, and MCP configurations.

Inspect the repository without installing anything:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 \
  npx plugins discover LeonardSEO/power-platform-skills-codex
```

PowerShell:

```powershell
$env:DISABLE_TELEMETRY = "1"
$env:DO_NOT_TRACK = "1"
npx plugins add LeonardSEO/power-platform-skills-codex --target codex
```

`DISABLE_TELEMETRY` and `DO_NOT_TRACK` disable the installer's anonymous usage
telemetry. They are separate from the plugin-level telemetry hard-off described
below.

Start a new Codex thread after installation so the new skills and MCP tools are
loaded.

## Example prompts

```text
Use power-automate:build-flow to build and publish a complete cloud flow.
```

```text
Use code-apps-preview:create-code-app to create a Power Apps code app.
```

```text
Use power-pages:create-site to create a Power Pages code site.
```

## Telemetry posture

Telemetry is hard-disabled in this Codex distribution:

- `plugins/power-pages/scripts/lib/telemetry/ikey.json` contains
  `"disabled": true`.
- Power Pages telemetry hooks are removed; its non-telemetry validation hook is
  preserved.
- Power Automate FlowAgent is forced to telemetry mode `off`, including its
  otherwise-default local telemetry log.
- No Microsoft production instrumentation keys or collector URLs are included.
- `config/telemetry-disabled.json` can be used as an additional global kill
  switch:

```bash
export POWER_PLATFORM_SKILLS_IKEY_JSON="$PWD/config/telemetry-disabled.json"
export POWER_PLATFORM_SKILLS_TELEMETRY_POWER_PAGES_OPTOUT=1
```

The repository validator fails if telemetry is enabled or if an actual
instrumentation key or collector URL is added to an active `ikey.json`.

## Validate

No package installation is required:

```bash
npm test
```

Validation checks:

- marketplace structure and all seven entries;
- all Codex plugin manifests;
- all 96 skill entrypoints;
- Codex-native MCP schemas and manifest references;
- the Power Automate FlowAgent initialize and tool-list handshake under Node.js;
- the telemetry hard-off contract.

## Repository layout

```text
power-platform-skills-codex/
├── .agents/plugins/marketplace.json
├── .github/workflows/validate.yml
├── config/telemetry-disabled.json
├── plugins/
│   ├── canvas-apps/
│   ├── code-apps-preview/
│   ├── mcp-apps/
│   ├── mobile-app/
│   ├── model-apps/
│   ├── power-automate/
│   └── power-pages/
├── scripts/validate-repository.mjs
├── azure-pipelines.yml
└── package.json
```

## Updating from Microsoft upstream

The scheduled [Sync Microsoft upstream](.github/workflows/sync-upstream.yml)
GitHub Action checks `microsoft/power-platform-skills@main` every Monday. When
Microsoft changes the source, the workflow:

- synchronizes additions, edits, and deletions;
- reapplies the Codex manifests and compatibility fixes;
- keeps telemetry hard-disabled and strips production telemetry routing;
- refreshes plugin versions and skill counts;
- runs the full validation suite;
- opens or updates a pull request and squash-merges it after validation passes.

The workflow can also be started manually from the GitHub Actions tab. See
[`UPSTREAM.md`](UPSTREAM.md) for the exact mappings and local sync command.

## License

The upstream source is licensed under the MIT License. The original Microsoft
copyright and license notice are preserved in [`LICENSE`](LICENSE).
