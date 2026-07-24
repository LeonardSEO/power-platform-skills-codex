#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
upstream_root="${1:-}"
upstream_commit="${2:-}"

if [[ -z "$upstream_root" || -z "$upstream_commit" ]]; then
  echo "Usage: scripts/sync-upstream.sh <upstream-checkout> <40-char-commit>"
  exit 2
fi

if [[ ! -f "$upstream_root/marketplace.json" ]]; then
  echo "Invalid upstream checkout: marketplace.json was not found."
  exit 2
fi

if [[ ! "$upstream_commit" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid upstream commit: expected a 40-character lowercase SHA."
  exit 2
fi

for command in node rsync; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command"
    exit 2
  fi
done

plugin_mappings=(
  "power-pages:power-pages"
  "model-apps:model-apps"
  "mcp-apps:mcp-apps"
  "canvas-apps:canvas-apps"
  "code-apps:code-apps-preview"
  "mobile-apps:mobile-app"
  "power-automate:power-automate"
)

for mapping in "${plugin_mappings[@]}"; do
  upstream_name="${mapping%%:*}"
  codex_name="${mapping##*:}"
  source_path="$upstream_root/plugins/$upstream_name/"
  destination_path="$repository_root/plugins/$codex_name/"

  if [[ ! -d "$source_path" ]]; then
    echo "Upstream plugin is missing: plugins/$upstream_name"
    exit 1
  fi

  if [[ ! -f "$destination_path/.codex-plugin/plugin.json" ]]; then
    echo "Codex manifest is missing before sync: plugins/$codex_name"
    exit 1
  fi

  # Upstream is authoritative for its plugin payload. The Codex manifest is the
  # only file excluded from deletion; target-specific adaptations are reapplied
  # deterministically by apply-codex-adaptations.mjs after every copy.
  rsync -a --delete \
    --exclude=".codex-plugin/" \
    "$source_path" \
    "$destination_path"
done

node "$repository_root/scripts/apply-codex-adaptations.mjs" \
  "$upstream_root" \
  "$upstream_commit"

npm --prefix "$repository_root" test
