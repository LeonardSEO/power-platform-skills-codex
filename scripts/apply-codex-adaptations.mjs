import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRoot = resolve(process.argv[2] || "");
const upstreamCommit = process.argv[3] || "";

const pluginMappings = new Map([
  ["power-pages", "power-pages"],
  ["model-apps", "model-apps"],
  ["mcp-apps", "mcp-apps"],
  ["canvas-apps", "canvas-apps"],
  ["code-apps-preview", "code-apps"],
  ["mobile-app", "mobile-apps"],
  ["power-automate", "power-automate"],
]);

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Invalid JSON at ${path}: ${error.message}`);
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

function countSkills(pluginRoot) {
  return walkFiles(join(pluginRoot, "skills")).filter((path) =>
    path.endsWith("/SKILL.md"),
  ).length;
}

function upstreamMarketplaceNames() {
  const marketplace = readJson(join(upstreamRoot, "marketplace.json"));
  if (!Array.isArray(marketplace.plugins)) {
    fail("Upstream marketplace does not contain a plugins array");
  }
  return new Set(marketplace.plugins.map((plugin) => plugin.name));
}

if (!existsSync(join(upstreamRoot, "marketplace.json"))) {
  fail(`Invalid upstream checkout: ${upstreamRoot}`);
}
if (!/^[0-9a-f]{40}$/.test(upstreamCommit)) {
  fail("Upstream commit must be a full lowercase SHA");
}

const mappedMarketplaceNames = new Set(pluginMappings.keys());
const discoveredUpstreamNames = upstreamMarketplaceNames();
const unexpectedPlugins = [...discoveredUpstreamNames].filter(
  (name) => !mappedMarketplaceNames.has(name),
);
if (unexpectedPlugins.length) {
  fail(
    "Upstream added unmapped plugins. Review and extend pluginMappings: " +
      unexpectedPlugins.join(", "),
  );
}
const missingPlugins = [...mappedMarketplaceNames].filter(
  (name) => !discoveredUpstreamNames.has(name),
);
if (missingPlugins.length) {
  fail(
    "Mapped plugins disappeared from upstream marketplace: " +
      missingPlugins.join(", "),
  );
}

const shortCommit = upstreamCommit.slice(0, 12);
const inventory = {
  generatedFrom: {
    repository: "microsoft/power-platform-skills",
    commit: upstreamCommit,
  },
  plugins: {},
  totalSkills: 0,
};

for (const [codexName, upstreamName] of pluginMappings) {
  const pluginRoot = join(repositoryRoot, "plugins", codexName);
  const upstreamManifest = readJson(
    join(upstreamRoot, "plugins", upstreamName, ".plugin", "plugin.json"),
  );
  const codexManifestPath = join(
    pluginRoot,
    ".codex-plugin",
    "plugin.json",
  );
  const codexManifest = readJson(codexManifestPath);

  if (codexManifest.name !== codexName) {
    fail(`Codex manifest name mismatch for ${codexName}`);
  }

  const upstreamVersion = String(upstreamManifest.version || "").split("+")[0];
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(upstreamVersion)) {
    fail(`Upstream ${upstreamName} has invalid SemVer: ${upstreamVersion}`);
  }
  codexManifest.version = `${upstreamVersion}+codex.${shortCommit}`;
  writeJson(codexManifestPath, codexManifest);

  const skillCount = countSkills(pluginRoot);
  inventory.plugins[codexName] = {
    upstreamPath: `plugins/${upstreamName}`,
    upstreamVersion,
    codexVersion: codexManifest.version,
    skills: skillCount,
  };
  inventory.totalSkills += skillCount;
}

const powerAutomateMcpPath = join(
  repositoryRoot,
  "plugins",
  "power-automate",
  ".mcp.json",
);
const powerAutomateMcp = readJson(powerAutomateMcpPath);
const flowAgent = powerAutomateMcp.mcpServers?.flowagent;
const flowAgentArgs = flowAgent?.args;
if (!Array.isArray(flowAgentArgs) || typeof flowAgentArgs[1] !== "string") {
  fail("Power Automate FlowAgent bootstrap is missing");
}
if (!flowAgentArgs[1].includes("globalThis.require=require")) {
  flowAgentArgs[1] = `globalThis.require=require;${flowAgentArgs[1]}`;
}
flowAgent.env = {
  ...flowAgent.env,
  FLOWAGENT_TELEMETRY: "off",
  POWER_PLATFORM_SKILLS_TELEMETRY: "off",
};
writeJson(powerAutomateMcpPath, powerAutomateMcp);

const powerPagesHooksPath = join(
  repositoryRoot,
  "plugins",
  "power-pages",
  "hooks",
  "hooks.json",
);
const powerPagesHooks = readJson(powerPagesHooksPath);
for (const [eventName, registrations] of Object.entries(
  powerPagesHooks.hooks || {},
)) {
  if (!Array.isArray(registrations)) continue;
  const retained = registrations
    .map((registration) => ({
      ...registration,
      hooks: Array.isArray(registration.hooks)
        ? registration.hooks.filter(
            (hook) =>
              typeof hook.command !== "string" ||
              !hook.command.toLowerCase().includes("telemetry"),
          )
        : registration.hooks,
    }))
    .filter(
      (registration) =>
        !Array.isArray(registration.hooks) || registration.hooks.length > 0,
    );
  if (retained.length) {
    powerPagesHooks.hooks[eventName] = retained;
  } else {
    delete powerPagesHooks.hooks[eventName];
  }
}
writeJson(powerPagesHooksPath, powerPagesHooks);

const mobileMcpPath = join(
  repositoryRoot,
  "plugins",
  "mobile-app",
  ".mcp.json",
);
const mobileMcp = readJson(mobileMcpPath);
delete mobileMcp.$schema;
delete mobileMcp._comment;
writeJson(mobileMcpPath, mobileMcp);

const mobileSampleDataSkillPath = join(
  repositoryRoot,
  "plugins",
  "mobile-app",
  "skills",
  "add-sample-data",
  "SKILL.md",
);
const mobileSampleDataSkill = readFileSync(
  mobileSampleDataSkillPath,
  "utf8",
).replace(/\r?\npps\.\r?\n/, "\n");
writeFileSync(mobileSampleDataSkillPath, mobileSampleDataSkill, "utf8");

writeJson(
  join(
    repositoryRoot,
    "plugins",
    "power-pages",
    "scripts",
    "lib",
    "telemetry",
    "ikey.json",
  ),
  {
    event_stream_name: "Disabled",
    disabled: true,
    default_region: "none",
    regions: {},
  },
);

writeJson(join(repositoryRoot, "config", "plugin-inventory.json"), inventory);
writeJson(
  join(repositoryRoot, ".upstream", "power-platform-skills.json"),
  {
    repository: "microsoft/power-platform-skills",
    branch: "main",
    commit: upstreamCommit,
  },
);

const readmePath = join(repositoryRoot, "README.md");
let readme = readFileSync(readmePath, "utf8");
for (const [pluginName, details] of Object.entries(inventory.plugins)) {
  const escapedName = pluginName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowPattern = new RegExp(
    String.raw`(\| \`${escapedName}\` \| )\d+( \|)`,
  );
  if (!rowPattern.test(readme)) {
    fail(`README plugin table row was not found for ${pluginName}`);
  }
  readme = readme.replace(rowPattern, `$1${details.skills}$2`);
}
readme = readme.replace(
  /Total: \*\*\d+ Codex skills\*\*\./,
  `Total: **${inventory.totalSkills} Codex skills**.`,
);
writeFileSync(readmePath, readme, "utf8");

console.log(
  `Applied Codex adaptations for upstream ${shortCommit}: ` +
    `${inventory.totalSkills} skills across ${pluginMappings.size} plugins.`,
);
