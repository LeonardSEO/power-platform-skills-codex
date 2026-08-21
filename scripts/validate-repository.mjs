import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = join(
  repositoryRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);
const claudeMarketplacePath = join(
  repositoryRoot,
  ".claude-plugin",
  "marketplace.json",
);
const inventoryPath = join(repositoryRoot, "config", "plugin-inventory.json");
const upstreamStatePath = join(
  repositoryRoot,
  ".upstream",
  "power-platform-skills.json",
);

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

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

function validateSkill(path) {
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`Missing YAML frontmatter in ${path}`);
  if (!/^name:\s*\S+/m.test(match[1])) fail(`Missing skill name in ${path}`);
  if (!/^description:\s*\S+/m.test(match[1])) {
    fail(`Missing skill description in ${path}`);
  }
}

function containsRoutingValue(value) {
  if (Array.isArray(value)) return value.some(containsRoutingValue);
  if (!value || typeof value !== "object") return false;

  for (const [key, nested] of Object.entries(value)) {
    if (
      /instrumentation.?key|collector.?url/i.test(key) &&
      typeof nested === "string" &&
      nested.trim()
    ) {
      return true;
    }
    if (containsRoutingValue(nested)) return true;
  }
  return false;
}

if (!existsSync(marketplacePath)) fail("Missing Codex marketplace manifest");
if (!existsSync(claudeMarketplacePath)) {
  fail("Missing Claude Code marketplace manifest");
}
if (!existsSync(inventoryPath)) fail("Missing generated plugin inventory");
if (!existsSync(upstreamStatePath)) fail("Missing upstream synchronization state");

const inventory = readJson(inventoryPath);
if (!inventory.plugins || typeof inventory.plugins !== "object") {
  fail("Plugin inventory must contain a plugins object");
}
const expectedSkills = new Map(
  Object.entries(inventory.plugins).map(([name, details]) => [
    name,
    details.skills,
  ]),
);
if (
  [...expectedSkills.values()].some(
    (count) => !Number.isInteger(count) || count < 1,
  )
) {
  fail("Plugin inventory contains an invalid skill count");
}

const upstreamState = readJson(upstreamStatePath);
if (
  upstreamState.repository !== "microsoft/power-platform-skills" ||
  !/^[0-9a-f]{40}$/.test(upstreamState.commit)
) {
  fail("Upstream synchronization state is invalid");
}

const marketplace = readJson(marketplacePath);
if (marketplace.name !== "power-platform-skills-codex") {
  fail(`Unexpected marketplace name: ${marketplace.name}`);
}
if (!marketplace.interface?.displayName) {
  fail("Codex marketplace is missing interface.displayName");
}
if (!Array.isArray(marketplace.plugins)) {
  fail("Marketplace plugins must be an array");
}

const entries = new Map(
  marketplace.plugins.map((entry) => {
    if (!entry?.name) fail("Marketplace entry is missing a name");
    if (entry.source?.source !== "local") {
      fail(`Plugin ${entry.name} must use a local source`);
    }
    if (entry.source?.path !== `./plugins/${entry.name}`) {
      fail(`Plugin ${entry.name} has an unexpected source path`);
    }
    if (!entry.policy?.installation || !entry.policy?.authentication) {
      fail(`Plugin ${entry.name} is missing marketplace policy fields`);
    }
    if (!entry.category) fail(`Plugin ${entry.name} is missing a category`);
    return [entry.name, entry];
  }),
);

const claudeMarketplace = readJson(claudeMarketplacePath);
if (claudeMarketplace.name !== "power-platform-skills-codex") {
  fail(`Unexpected Claude marketplace name: ${claudeMarketplace.name}`);
}
if (
  claudeMarketplace.owner?.name !== "LeonardSEO" ||
  claudeMarketplace.metadata?.pluginRoot !== "."
) {
  fail("Claude marketplace metadata is incomplete");
}
if (!Array.isArray(claudeMarketplace.plugins)) {
  fail("Claude marketplace plugins must be an array");
}
const claudeEntries = new Map(
  claudeMarketplace.plugins.map((entry) => {
    if (!entry?.name) fail("Claude marketplace entry is missing a name");
    if (entry.source !== `./plugins/${entry.name}`) {
      fail(`Claude plugin ${entry.name} has an unexpected source path`);
    }
    return [entry.name, entry];
  }),
);

if (entries.size !== expectedSkills.size) {
  fail(
    `Expected ${expectedSkills.size} marketplace plugins, found ${entries.size}`,
  );
}
if (claudeEntries.size !== expectedSkills.size) {
  fail(
    `Expected ${expectedSkills.size} Claude marketplace plugins, found ${claudeEntries.size}`,
  );
}

let totalSkills = 0;
for (const [pluginName, expectedCount] of expectedSkills) {
  if (!entries.has(pluginName)) fail(`Marketplace is missing ${pluginName}`);
  if (!claudeEntries.has(pluginName)) {
    fail(`Claude marketplace is missing ${pluginName}`);
  }

  const pluginRoot = join(repositoryRoot, "plugins", pluginName);
  const claudeManifestPath = join(
    pluginRoot,
    ".claude-plugin",
    "plugin.json",
  );
  if (!existsSync(claudeManifestPath)) {
    fail(`Missing Claude manifest for ${pluginName}`);
  }
  const claudeManifest = readJson(claudeManifestPath);
  if (claudeManifest.name !== pluginName) {
    fail(`Claude manifest name mismatch for ${pluginName}`);
  }

  const manifestPath = join(pluginRoot, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) fail(`Missing Codex manifest for ${pluginName}`);

  const manifest = readJson(manifestPath);
  if (manifest.name !== pluginName) {
    fail(`Manifest name mismatch for ${pluginName}: ${manifest.name}`);
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    fail(`Invalid SemVer for ${pluginName}: ${manifest.version}`);
  }
  if (!manifest.description || !manifest.author?.name || !manifest.interface) {
    fail(`Incomplete Codex manifest for ${pluginName}`);
  }
  if (manifest.skills !== "./skills/") {
    fail(`Codex manifest for ${pluginName} must reference ./skills/`);
  }

  if (manifest.mcpServers) {
    if (manifest.mcpServers !== "./.codex.mcp.json") {
      fail(
        `Codex manifest for ${pluginName} must reference ./.codex.mcp.json`,
      );
    }
    const mcpPath = resolve(pluginRoot, manifest.mcpServers);
    if (!existsSync(mcpPath)) {
      fail(`Missing MCP configuration for ${pluginName}: ${mcpPath}`);
    }
    const mcpConfig = readJson(mcpPath);
    if (mcpConfig.mcpServers || mcpConfig.mcp_servers) {
      fail(
        `Codex MCP configuration for ${pluginName} must be a direct server map`,
      );
    }
  }

  const skillsRoot = join(pluginRoot, "skills");
  const skillFiles = walkFiles(skillsRoot).filter(
    (path) => path.endsWith("/SKILL.md"),
  );
  if (skillFiles.length !== expectedCount) {
    fail(
      `${pluginName} has ${skillFiles.length} skills; expected ${expectedCount}`,
    );
  }
  skillFiles.forEach(validateSkill);
  totalSkills += skillFiles.length;
}

if (inventory.totalSkills !== totalSkills) {
  fail(
    `Inventory total is ${inventory.totalSkills}; discovered ${totalSkills} skills`,
  );
}
if (inventory.generatedFrom?.commit !== upstreamState.commit) {
  fail("Plugin inventory and upstream synchronization state disagree");
}

const telemetryFiles = walkFiles(join(repositoryRoot, "plugins")).filter(
  (path) => path.endsWith("/telemetry/ikey.json"),
);
for (const path of telemetryFiles) {
  const config = readJson(path);
  if (config.disabled !== true) {
    fail(`Telemetry must be hard-disabled in ${path}`);
  }
  if (containsRoutingValue(config)) {
    fail(`Telemetry routing values are not allowed in ${path}`);
  }
}

const globalKillSwitch = readJson(
  join(repositoryRoot, "config", "telemetry-disabled.json"),
);
if (globalKillSwitch.disabled !== true) {
  fail("Global telemetry kill switch must be enabled");
}

const powerAutomateRoot = join(repositoryRoot, "plugins", "power-automate");
const powerAutomateMcp = readJson(
  join(powerAutomateRoot, ".codex.mcp.json"),
);
const flowAgent = powerAutomateMcp.flowagent;
const claudePowerAutomateMcp = readJson(
  join(powerAutomateRoot, ".mcp.json"),
);
const claudeFlowAgent = claudePowerAutomateMcp.mcpServers?.flowagent;
if (!flowAgent || flowAgent.command !== "node") {
  fail("Power Automate FlowAgent MCP configuration is missing");
}
if (!claudeFlowAgent || claudeFlowAgent.command !== "node") {
  fail("Power Automate Claude FlowAgent MCP configuration is missing");
}
if (
  flowAgent.env?.FLOWAGENT_TELEMETRY !== "off" ||
  flowAgent.env?.POWER_PLATFORM_SKILLS_TELEMETRY !== "off" ||
  claudeFlowAgent.env?.FLOWAGENT_TELEMETRY !== "off" ||
  claudeFlowAgent.env?.POWER_PLATFORM_SKILLS_TELEMETRY !== "off"
) {
  fail("Power Automate FlowAgent telemetry must be explicitly disabled");
}
const bootstrap = flowAgent.args?.[1];
const claudeBootstrap = claudeFlowAgent.args?.[1];
if (
  typeof bootstrap !== "string" ||
  !bootstrap.includes("globalThis.require=require")
) {
  fail("Power Automate Node.js 22 compatibility bootstrap is missing");
}
if (
  typeof claudeBootstrap !== "string" ||
  !claudeBootstrap.includes("globalThis.require=require") ||
  !claudeBootstrap.includes("CLAUDE_PLUGIN_ROOT")
) {
  fail("Power Automate Claude FlowAgent compatibility bootstrap is missing");
}

const initializeRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "codex-adapter-validator", version: "1.0.0" },
  },
});
const initializedNotification = JSON.stringify({
  jsonrpc: "2.0",
  method: "notifications/initialized",
});
const toolsListRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
  params: {},
});
function validateFlowAgent(bootstrapSource, rootEnvironment, clientName) {
  const smokeTest = spawnSync("node", ["-e", bootstrapSource], {
    cwd: powerAutomateRoot,
    env: {
      ...process.env,
      ...rootEnvironment,
      POWER_PLATFORM_SKILLS_IKEY_JSON: join(
        repositoryRoot,
        "config",
        "telemetry-disabled.json",
      ),
    },
    input: `${initializeRequest}\n${initializedNotification}\n${toolsListRequest}\n`,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (smokeTest.status !== 0) {
    fail(
      `${clientName} FlowAgent smoke test failed:\n${smokeTest.stdout}\n${smokeTest.stderr}`,
    );
  }
  if (
    !`${smokeTest.stdout}\n${smokeTest.stderr}`.includes(
      "FlowAgent MCP server running on stdio",
    )
  ) {
    fail(`${clientName} FlowAgent smoke test did not report a successful start`);
  }
  const responses = smokeTest.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail(
          `${clientName} FlowAgent returned invalid JSON-RPC output: ${error.message}`,
        );
      }
    });
  const initializeResponse = responses.find((response) => response.id === 1);
  if (initializeResponse?.result?.serverInfo?.name !== "flowagent-mcp") {
    fail(`${clientName} FlowAgent MCP initialize handshake failed`);
  }
  const toolsResponse = responses.find((response) => response.id === 2);
  const toolNames = new Set(
    (toolsResponse?.result?.tools || []).map((tool) => tool.name),
  );
  for (const requiredTool of ["list_flows", "create_flow", "publish_flow"]) {
    if (!toolNames.has(requiredTool)) {
      fail(
        `${clientName} FlowAgent MCP is missing required tool: ${requiredTool}`,
      );
    }
  }
}

validateFlowAgent(bootstrap, { PLUGIN_ROOT: powerAutomateRoot }, "Codex");
validateFlowAgent(
  claudeBootstrap,
  { CLAUDE_PLUGIN_ROOT: powerAutomateRoot },
  "Claude Code",
);

const powerPagesHooksPath = join(
  repositoryRoot,
  "plugins",
  "power-pages",
  "hooks",
  "hooks.json",
);
const serializedPowerPagesHooks = readFileSync(powerPagesHooksPath, "utf8");
readJson(powerPagesHooksPath);
if (/telemetry/i.test(serializedPowerPagesHooks)) {
  fail("Power Pages telemetry hooks must not be registered");
}

console.log(
  `Validation passed: ${entries.size} plugins, ${totalSkills} skills, ` +
    `${telemetryFiles.length} hard-disabled telemetry configuration(s), ` +
    `upstream ${upstreamState.commit.slice(0, 12)}.`,
);
