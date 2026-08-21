# Power Platform Skills for Codex

[![Validate](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/validate.yml/badge.svg)](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/validate.yml)
[![Sync Microsoft upstream](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/LeonardSEO/power-platform-skills-codex/actions/workflows/sync-upstream.yml)

A Codex-optimized distribution of Microsoft's
[`power-platform-skills`](https://github.com/microsoft/power-platform-skills).
It packages the complete Power Platform marketplace for Codex while preserving
compatibility with the upstream Claude Code and GitHub Copilot CLI formats.

This is an independent, unofficial adaptation. Microsoft remains the author and
copyright holder of the upstream content.

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

**Total: 7 plugins and 96 skill definitions.**

## Installation

### Codex CLI

Add this repository as a Codex marketplace:

```bash
codex plugin marketplace add LeonardSEO/power-platform-skills-codex
```

Install all seven plugins:

```bash
codex plugin add power-pages@power-platform-skills-codex
codex plugin add model-apps@power-platform-skills-codex
codex plugin add mcp-apps@power-platform-skills-codex
codex plugin add canvas-apps@power-platform-skills-codex
codex plugin add code-apps-preview@power-platform-skills-codex
codex plugin add mobile-app@power-platform-skills-codex
codex plugin add power-automate@power-platform-skills-codex
```

### Universal installer

Install the complete suite into Codex with one command:

```bash
DO_NOT_TRACK=1 npx plugins@latest add LeonardSEO/power-platform-skills-codex --target codex --scope user --yes
```

`DO_NOT_TRACK=1` disables the universal installer's anonymous installation
telemetry. It is separate from this distribution's telemetry safeguards.

Start a new Codex chat or CLI session after installation. Confirm the
installation with:

```bash
codex plugin list
```

### Claude Code

Run these commands inside Claude Code:

```text
/plugin marketplace add LeonardSEO/power-platform-skills-codex
/plugin
```

Install the desired plugins from `power-platform-skills-codex`, then run
`/reload-plugins`.

## Requirements

- Codex CLI with plugin support or Claude Code
- Node.js 18 or newer
- Azure CLI (`az`) for Microsoft authentication
- Power Platform CLI (`pac`) for Power Platform operations
- .NET `dnx` for the Canvas Authoring MCP server

Some plugins have additional setup instructions in their own `README.md`,
`AGENTS.md`, or setup skill.

## Usage

Build and publish a Power Automate cloud flow:

```text
Use power-automate:build-flow to build and publish a complete cloud flow.
```

Create a React and Vite Power Apps code app:

```text
Use code-apps-preview:create-code-app to create a Power Apps code app.
```

Build and deploy a Power Pages site:

```text
Use power-pages:create-site to create a Power Pages code site.
```

## Codex compatibility

This distribution adds and maintains the Codex-specific integration layer:

- `.codex-plugin/plugin.json` manifests for all seven plugins
- A Codex marketplace at `.agents/plugins/marketplace.json`
- A native Claude Code marketplace at `.claude-plugin/marketplace.json`
- Direct `.codex.mcp.json` server maps for Codex
- Original `.mcp.json` files for Claude Code and GitHub Copilot CLI
- A Node.js 22 and 24 compatibility bootstrap for Power Automate FlowAgent
- Automatic validation of plugin manifests, skills, MCP configuration, and
  telemetry safeguards

### Power Automate FlowAgent

The bundled FlowAgent MCP server is wired through a dedicated Codex-native MCP
configuration. Repository validation starts the server, completes the MCP
`initialize` handshake, requests `tools/list`, and confirms essential tools such
as `list_flows`, `create_flow`, and `publish_flow`.

## Telemetry

Microsoft Power Platform telemetry is hard-disabled in this distribution:

- Power Pages 1DS telemetry hooks are removed
- Microsoft production instrumentation keys and collector URLs are removed
- Power Automate FlowAgent is forced into telemetry mode `off`
- `config/telemetry-disabled.json` provides a repository-wide kill switch
- CI fails if telemetry is re-enabled or a production telemetry route returns

These safeguards apply to the installed Power Platform plugins. External tools
such as the optional `npx plugins` installer have their own telemetry settings.

## Validation

No package installation is required:

```bash
npm test
```

The validation suite checks:

- All seven Codex and Claude Code marketplace entries and manifests
- All 96 skill definitions
- Codex- and Claude-native MCP schemas and manifest references
- The Codex and Claude FlowAgent startup, initialization, and tool-list handshake
- The telemetry hard-off contract
- Consistency with the recorded Microsoft upstream commit

## Microsoft upstream synchronization

The scheduled [Sync Microsoft upstream](.github/workflows/sync-upstream.yml)
workflow checks `microsoft/power-platform-skills@main` every Monday. When the
upstream repository changes, the workflow:

1. Synchronizes upstream additions, edits, and deletions.
2. Reapplies the Codex manifests, MCP adapters, and compatibility fixes.
3. Keeps telemetry hard-disabled.
4. Refreshes plugin versions and skill counts.
5. Runs the complete validation suite.
6. Opens or updates a pull request and squash-merges it after validation.

See [`UPSTREAM.md`](UPSTREAM.md) for the plugin mappings and local synchronization
procedure.

## License

The upstream source is licensed under the MIT License. The original Microsoft
copyright and license notice are preserved in [`LICENSE`](LICENSE). See
[`NOTICE.md`](NOTICE.md) for attribution and adaptation details.
