import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const commit = "a".repeat(40);
const dataverseCommit = "b".repeat(40);

test("sync includes new local plugins, pins Dataverse, preserves overlays and rejects source drift", () => {
  const directory = mkdtempSync(join(tmpdir(), "power-platform-sync-"));
  const root = join(directory, "codex");
  const upstream = join(directory, "upstream");
  const dataverse = join(directory, "dataverse");
  function copy(path, target = path) {
    mkdirSync(dirname(join(root, target)), { recursive: true });
    cpSync(join(repository, path), join(root, target), { recursive: true });
  }
  function write(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
  }
  function run(script, source, sha) {
    return spawnSync(process.execPath, [join(root, "scripts", script), source, sha], { encoding: "utf8" });
  }
  try {
    for (const path of ["scripts/apply-codex-adaptations.mjs", "scripts/sync-dataverse.mjs", "config", "README.md", ".agents", ".claude-plugin", ".upstream"]) copy(path);
    const inventory = readJson(join(repository, "config/plugin-inventory.json"));
    const entries = [];
    for (const [name, details] of Object.entries(inventory.plugins)) {
      const sourceRoot = name === "dataverse" ? join(dataverse, details.upstreamPath) : join(upstream, details.upstreamPath);
      const manifestPath = name === "dataverse" ? ".codex-plugin/plugin.json" : ".plugin/plugin.json";
      const manifest = readJson(join(repository, "plugins", name, manifestPath));
      manifest.version = details.upstreamVersion;
      write(join(sourceRoot, manifestPath), manifest);
      if (name === "dataverse") {
        write(join(sourceRoot, "skills/example/SKILL.md"), "---\nname: example\ndescription: Example\n---\n");
        write(join(sourceRoot, ".claude-plugin/plugin.json"), manifest);
        continue;
      }
      entries.push({ name, source: `./${details.upstreamPath}` });
      copy(`plugins/${name}/.codex-plugin`);
      write(join(root, "plugins", name, "skills/example/SKILL.md"), "---\nname: example\ndescription: Example\n---\n");
      if (existsSync(join(repository, "plugins", name, ".mcp.json"))) copy(`plugins/${name}/.mcp.json`);
    }
    copy("plugins/power-pages/hooks/hooks.json");
    for (const name of ["build-flow", "create-flow"]) copy(`plugins/power-automate/skills/${name}/SKILL.md`);
    copy("plugins/power-automate/README.md");
    mkdirSync(join(root, "plugins/power-automate/references"), { recursive: true });
    copy("plugins/mobile-app/skills/add-sample-data/SKILL.md");
    entries.push({ name: "dataverse", source: { source: "github", repo: "microsoft/Dataverse-skills", path: ".github/plugins/dataverse" } });
    write(join(upstream, "marketplace.json"), { plugins: entries });
    write(join(dataverse, "LICENSE"), "Fixture license");
    write(join(root, "plugins/dataverse/stale.txt"), "must be deleted");
    let result = run("sync-dataverse.mjs", dataverse, dataverseCommit);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(root, "plugins/dataverse/stale.txt")), false);
    result = run("apply-codex-adaptations.mjs", upstream, commit);
    assert.equal(result.status, 0, result.stderr);
    const updated = readJson(join(root, "config/plugin-inventory.json"));
    assert.equal(Object.keys(updated.plugins).length, 11);
    assert.equal(updated.plugins.dataverse.upstreamCommit, dataverseCommit);
    assert.equal(readJson(join(root, "plugins/dataverse/.codex-plugin/plugin.json")).version, `${inventory.plugins.dataverse.upstreamVersion}+codex.${dataverseCommit.slice(0, 12)}`);
    for (const name of ["pcf", "power-apps-mobile-extension", "process-intelligence", "dataverse"]) {
      assert.ok(readJson(join(root, ".agents/plugins/marketplace.json")).plugins.some((entry) => entry.name === name));
      assert.ok(existsSync(join(root, "plugins", name, ".claude-plugin/plugin.json")));
    }
    assert.ok(readFileSync(join(root, "plugins/power-automate/skills/build-custom-connector/SKILL.md"), "utf8").includes("name:"));
    assert.ok(readJson(join(root, "plugins/power-automate/.codex.mcp.json")).flowagent.args[1].includes("globalThis.require=require"));
    const snapshot = readFileSync(join(root, "config/plugin-inventory.json"), "utf8");
    result = run("apply-codex-adaptations.mjs", upstream, commit);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(root, "config/plugin-inventory.json"), "utf8"), snapshot);
    entries.at(-1).source.repo = "unexpected/repository";
    write(join(upstream, "marketplace.json"), { plugins: entries });
    result = run("apply-codex-adaptations.mjs", upstream, commit);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Dataverse source changed/);
    entries.at(-1).source.repo = "microsoft/Dataverse-skills";
    entries.push({ name: "unknown-plugin", source: "./plugins/unknown-plugin" });
    write(join(upstream, "marketplace.json"), { plugins: entries });
    result = run("apply-codex-adaptations.mjs", upstream, commit);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unmapped plugins.*unknown-plugin/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
