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

## Install the complete suite

The repository is one marketplace containing all seven Power Platform plugins.
Use either the native Codex CLI or the universal `plugins` installer. Both
routes install the complete suite, including its 96 skills and bundled MCP
servers.

### [Native Codex CLI](https://developers.openai.com/codex/developer-commands#codex-plugin) (recommended)

Add this repository as a Codex marketplace:

```bash
codex plugin marketplace add LeonardSEO/power-platform-skills-codex
```

Codex does not currently have an `install-all` marketplace command. Install the
complete suite with this single terminal block:

```bash
for plugin in power-pages model-apps mcp-apps canvas-apps code-apps-preview mobile-app power-automate; do
  codex plugin add "$plugin@power-platform-skills-codex"
done
```

PowerShell:

```powershell
codex plugin marketplace add LeonardSEO/power-platform-skills-codex

$plugins = @(
  "power-pages",
  "model-apps",
  "mcp-apps",
  "canvas-apps",
  "code-apps-preview",
  "mobile-app",
  "power-automate"
)

foreach ($plugin in $plugins) {
  codex plugin add "$plugin@power-platform-skills-codex"
}
```

Confirm that all seven plugins are installed:

```bash
codex plugin list
```

You can also start `codex`, enter `/plugins`, select the
`power-platform-skills-codex` marketplace, and inspect the installed entries.

### [Universal installer](https://www.npmjs.com/package/plugins) (`npx plugins`)

Install the complete suite into Codex with one command:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 \
  npx plugins@latest add LeonardSEO/power-platform-skills-codex \
  --target codex --scope user --yes
```

PowerShell:

```powershell
$env:DISABLE_TELEMETRY = "1"
$env:DO_NOT_TRACK = "1"
npx plugins@latest add LeonardSEO/power-platform-skills-codex `
  --target codex --scope user --yes
```

To install the complete suite into every supported coding agent detected on the
machine, omit `--target codex`:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 \
  npx plugins@latest add LeonardSEO/power-platform-skills-codex \
  --scope user --yes
```

The current `plugins` CLI supports Claude Code, Cursor, Codex, Grok Build, Kimi
Code, GitHub Copilot CLI, and Visual Studio Code. This repository has been
verified with `plugins discover`: all seven marketplace entries and their
skills, agents, hooks, and MCP configurations are detected.

`DISABLE_TELEMETRY` and `DO_NOT_TRACK` disable the installer's anonymous usage
telemetry. They are separate from the plugin-level telemetry hard-off described
below.

Start a new Codex chat or CLI session after installation so the new skills and
MCP tools are loaded.

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
