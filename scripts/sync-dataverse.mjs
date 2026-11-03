import { writePluginPackage } from "./plugin-package.mjs";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstream = resolve(process.argv[2] || "");
const commit = process.argv[3] || "";
if (!/^[0-9a-f]{40}$/.test(commit)) {
  throw new Error("Usage: node scripts/sync-dataverse.mjs <Dataverse-skills-checkout> <40-char-commit>");
}
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const source = join(upstream, ".github/plugins/dataverse");
const manifest = readJson(join(source, ".codex-plugin/plugin.json"));
if (manifest.name !== "dataverse" || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  throw new Error("Unexpected upstream Dataverse manifest");
}
const destination = join(root, "plugins/dataverse");
mkdirSync(destination, { recursive: true });
const copy = spawnSync("rsync", ["-a", "--delete", `${source}/`, `${destination}/`], { stdio: "inherit" });
if (copy.error) throw copy.error;
if (copy.status !== 0) throw new Error("Dataverse source synchronization failed");
cpSync(join(upstream, "LICENSE"), join(destination, "LICENSE"));
const upstreamVersion = manifest.version;
manifest.version = `${upstreamVersion}+codex.${commit.slice(0, 12)}`;
writeJson(join(destination, ".codex-plugin/plugin.json"), manifest);
writePluginPackage(root, "dataverse");
function countSkills(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) =>
    total + (entry.isDirectory() ? countSkills(join(directory, entry.name)) : Number(entry.name === "SKILL.md")), 0);
}
const skills = countSkills(join(destination, "skills"));
const inventoryPath = join(root, "config/plugin-inventory.json");
const inventory = readJson(inventoryPath);
inventory.totalSkills += skills - (inventory.plugins.dataverse?.skills || 0);
inventory.plugins.dataverse = {
  upstreamRepository: "microsoft/Dataverse-skills",
  upstreamPath: ".github/plugins/dataverse",
  upstreamCommit: commit,
  upstreamVersion,
  codexVersion: manifest.version,
  skills,
};
writeJson(inventoryPath, inventory);
writeJson(join(root, ".upstream/dataverse-skills.json"), {
  repository: "microsoft/Dataverse-skills", branch: "main", commit,
});
for (const path of [".agents/plugins/marketplace.json", ".claude-plugin/marketplace.json"]) {
  const marketplace = readJson(join(root, path));
  if (!marketplace.plugins.some((entry) => entry.name === "dataverse")) {
    marketplace.plugins.push(path.startsWith(".agents") ? {
      name: "dataverse",
      source: { source: "local", path: "./plugins/dataverse" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    } : { name: "dataverse", source: "./plugins/dataverse" });
  }
  writeJson(join(root, path), marketplace);
}
const readmePath = join(root, "README.md");
writeFileSync(readmePath, readFileSync(readmePath, "utf8")
  .replace(/(\| `dataverse` \| )\d+( \|)/, `$1${skills}$2`)
  .replace(/\*\*Total: \d+ plugins and \d+ skill definitions\.\*\*/,
    `**Total: ${Object.keys(inventory.plugins).length} plugins and ${inventory.totalSkills} skill definitions.**`));
console.log(`Synchronized Dataverse ${upstreamVersion} (${commit.slice(0, 12)}): ${skills} skills. Run npm test after synchronization.`);
