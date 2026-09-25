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
const scope = process.argv[4] || "all";

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

function createCodexMcpConfig(pluginName, sourceConfig) {
  const servers = sourceConfig.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    fail(`Upstream MCP configuration for ${pluginName} has no mcpServers map`);
  }

  return Object.fromEntries(
    Object.entries(servers).map(([serverName, serverConfig]) => {
      if (
        !serverConfig ||
        typeof serverConfig !== "object" ||
        Array.isArray(serverConfig)
      ) {
        fail(`Invalid MCP server ${serverName} in ${pluginName}`);
      }

      const codexConfig = { ...serverConfig };
      if (codexConfig.url && ["http", "sse"].includes(codexConfig.type)) {
        delete codexConfig.type;
      }
      return [serverName, codexConfig];
    }),
  );
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

function applyPowerAutomateFlowDesign() {
  const pluginRoot = join(repositoryRoot, "plugins", "power-automate");
  const pluginReadmePath = join(pluginRoot, "README.md");
  const pluginReadme = readFileSync(pluginReadmePath, "utf8");
  writeFileSync(
    pluginReadmePath,
    pluginReadme.replace("It needs only Node.js 18+", "It needs Node.js 20+"),
    "utf8",
  );
  const guide = readFileSync(
    join(repositoryRoot, "config", "power-automate-flow-design.md"),
    "utf8",
  );
  writeFileSync(join(pluginRoot, "references", "flow-readability.md"), guide);

  for (const skillName of ["build-flow", "create-flow"]) {
    const skillPath = join(pluginRoot, "skills", skillName, "SKILL.md");
    let skill = readFileSync(skillPath, "utf8");
    const heading = "## Customer-readable flow design";
    if (skill.includes(heading)) continue;
    const insertionPoint = skillName === "build-flow" ? "## Critical Rules" : "## Steps";
    if (!skill.includes(insertionPoint)) {
      fail(`${skillName} is missing the flow-design insertion point`);
    }
    const designInstructions = skillName === "build-flow"
      ? `Follow [flow-readability.md](../../references/flow-readability.md) and apply these rules directly when building the flow:\n\n${guide.replace(/^# [^\n]+\n\n/, "")}`
      : "For Dutch customer handover, follow [flow-readability.md](../../references/flow-readability.md) when designing and reviewing the flow. Visible, explainable business steps take priority over action count, template compactness, and generation speed. A complex expression is acceptable inside a block with one clear purpose.\n";
    skill = skill.replace(
      insertionPoint,
      `${heading}\n\n${designInstructions}\n${insertionPoint}`,
    );
    if (skillName === "build-flow") {
      skill = skill.replace(
        "**Target: common 2-3 action flows should complete in under 60 seconds / fewer than 8 tool calls.**",
        "Build as many actions as needed to show the business process clearly in the designer. Do not optimize for a target action count or generation time.",
      );
      skill = skill.replace(
        "This is the fastest path.",
        "Review and restructure the template for readability before creating the flow.",
      );
    }
    writeFileSync(skillPath, skill);
  }
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

if (scope === "power-automate") {
  if (!upstreamMarketplaceNames().has(scope)) {
    fail(`Upstream marketplace is missing ${scope}`);
  }

  const pluginRoot = join(repositoryRoot, "plugins", scope);
  const upstreamManifest = readJson(
    join(upstreamRoot, "plugins", scope, ".plugin", "plugin.json"),
  );
  const upstreamVersion = String(upstreamManifest.version || "").split("+")[0];
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(upstreamVersion)) {
    fail(`Upstream ${scope} has invalid SemVer: ${upstreamVersion}`);
  }

  const codexManifestPath = join(pluginRoot, ".codex-plugin", "plugin.json");
  const codexManifest = readJson(codexManifestPath);
  if (codexManifest.name !== scope) fail(`Codex manifest name mismatch for ${scope}`);
  codexManifest.version = `${upstreamVersion}+codex.${upstreamCommit.slice(0, 12)}`;
  codexManifest.mcpServers = "./.codex.mcp.json";
  writeJson(codexManifestPath, codexManifest);

  const mcpPath = join(pluginRoot, ".mcp.json");
  const mcp = readJson(mcpPath);
  const flowAgent = mcp.mcpServers?.flowagent;
  if (!Array.isArray(flowAgent?.args) || typeof flowAgent.args[1] !== "string") {
    fail("Power Automate FlowAgent bootstrap is missing");
  }
  if (!flowAgent.args[1].includes("globalThis.require=require")) {
    flowAgent.args[1] = `globalThis.require=require;${flowAgent.args[1]}`;
  }
  flowAgent.env = {
    ...flowAgent.env,
    FLOWAGENT_TELEMETRY: "off",
    POWER_PLATFORM_SKILLS_TELEMETRY: "off",
  };
  writeJson(mcpPath, mcp);
  writeJson(join(pluginRoot, ".codex.mcp.json"), createCodexMcpConfig(scope, mcp));

  const inventoryPath = join(repositoryRoot, "config", "plugin-inventory.json");
  const inventory = readJson(inventoryPath);
  const previousSkills = inventory.plugins?.[scope]?.skills;
  if (!Number.isInteger(previousSkills)) fail(`Inventory is missing ${scope}`);
  const skills = countSkills(pluginRoot);
  inventory.plugins[scope] = {
    upstreamPath: `plugins/${scope}`,
    upstreamVersion,
    codexVersion: codexManifest.version,
    upstreamCommit,
    skills,
  };
  inventory.totalSkills += skills - previousSkills;
  writeJson(inventoryPath, inventory);

  const readmePath = join(repositoryRoot, "README.md");
  const readme = readFileSync(readmePath, "utf8");
  if (!/\| `power-automate` \| \d+ \|/.test(readme)) {
    fail("README power-automate table row was not found");
  }
  writeFileSync(
    readmePath,
    readme
      .replace(/(\| `power-automate` \| )\d+( \|)/, `$1${skills}$2`)
      .replace(
        /\*\*Total: \d+ plugins and \d+ skill definitions\.\*\*/,
        `**Total: ${Object.keys(inventory.plugins).length} plugins and ${inventory.totalSkills} skill definitions.**`,
      ),
    "utf8",
  );
  applyPowerAutomateFlowDesign();
  console.log(`Applied Codex adaptations for ${scope} from ${upstreamCommit.slice(0, 12)}.`);
  process.exit(0);
}
if (scope !== "all") fail(`Unsupported sync scope: ${scope}`);

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

const claudeMarketplace = {
  name: "power-platform-skills-codex",
  owner: {
    name: "LeonardSEO",
  },
  metadata: {
    description:
      "Power Platform plugins optimized for Codex with native Claude Code compatibility",
    pluginRoot: ".",
  },
  plugins: [...pluginMappings.keys()].map((pluginName) => ({
    name: pluginName,
    source: `./plugins/${pluginName}`,
  })),
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

for (const [pluginName] of pluginMappings) {
  const pluginRoot = join(repositoryRoot, "plugins", pluginName);
  const sourceMcpPath = join(pluginRoot, ".mcp.json");
  if (!existsSync(sourceMcpPath)) continue;

  const codexMcpPath = join(pluginRoot, ".codex.mcp.json");
  writeJson(
    codexMcpPath,
    createCodexMcpConfig(pluginName, readJson(sourceMcpPath)),
  );

  const codexManifestPath = join(
    pluginRoot,
    ".codex-plugin",
    "plugin.json",
  );
  const codexManifest = readJson(codexManifestPath);
  codexManifest.mcpServers = "./.codex.mcp.json";
  writeJson(codexManifestPath, codexManifest);
}

const telemetryFiles = walkFiles(join(repositoryRoot, "plugins")).filter(
  (path) => path.endsWith("/telemetry/ikey.json"),
);
for (const telemetryFile of telemetryFiles) {
  writeJson(telemetryFile, {
    event_stream_name: "Disabled",
    disabled: true,
    default_region: "none",
    regions: {},
  });
}

writeJson(join(repositoryRoot, "config", "plugin-inventory.json"), inventory);
writeJson(
  join(repositoryRoot, ".claude-plugin", "marketplace.json"),
  claudeMarketplace,
);
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
  /\*\*Total: \d+ plugins and \d+ skill definitions\.\*\*/,
  `**Total: ${pluginMappings.size} plugins and ${inventory.totalSkills} skill definitions.**`,
);
writeFileSync(readmePath, readme, "utf8");

applyPowerAutomateFlowDesign();

console.log(
  `Applied Codex adaptations for upstream ${shortCommit}: ` +
    `${inventory.totalSkills} skills across ${pluginMappings.size} plugins.`,
);
