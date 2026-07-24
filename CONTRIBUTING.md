# Contributing

Contributions should remain small, reviewable, and compatible with Codex.

## Before submitting a change

1. Preserve the original Microsoft attribution and MIT license.
2. Keep `.codex-plugin/plugin.json` aligned with the plugin folder name.
3. Keep Power Pages telemetry hard-disabled.
4. Do not add credentials, tokens, production instrumentation keys, or customer
   data.
5. Avoid changing upstream workflows unless the change is required for Codex
   compatibility.
6. Run:

   ```bash
   npm test
   ```

For upstream behavior changes that are not Codex-specific, consider contributing
them to `microsoft/power-platform-skills` first.
