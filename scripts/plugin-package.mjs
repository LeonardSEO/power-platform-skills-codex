import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const pluginSchema = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const mcpSchema = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

export function portableServers(servers) {
  return Object.fromEntries(Object.entries(servers).map(([name, server]) => [name, {
    ...server,
    type: server.url ? "streamable-http" : "stdio",
  }]));
}

export function writePluginPackage(repositoryRoot, pluginName) {
  const root = join(repositoryRoot, "plugins", pluginName);
  const compatibilityPath = join(root, ".codex-plugin/plugin.json");
  const compatibility = JSON.parse(readFileSync(compatibilityPath, "utf8"));
  const presentation = compatibility.interface;
  const projectIcon = "./assets/codex-power-platform.svg";
  if (!presentation.logo || !presentation.composerIcon || presentation.logo === projectIcon || presentation.composerIcon === projectIcon) {
    mkdirSync(join(root, "assets"), { recursive: true });
    cpSync(join(repositoryRoot, "config/plugin-icon.svg"), join(root, "assets/codex-power-platform.svg"));
    presentation.logo ||= projectIcon;
    presentation.composerIcon ||= projectIcon;
  }
  const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  writeJson(compatibilityPath, compatibility);
  const portable = { $schema: pluginSchema };
  for (const key of ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"]) {
    if (compatibility[key] !== undefined) portable[key] = compatibility[key];
  }
  portable.extensions = {
    ...compatibility.extensions,
    "com.openai": {
      ...compatibility.extensions?.["com.openai"],
      interface: presentation,
    },
  };
  writeJson(join(root, "plugin.json"), portable);
  if (compatibility.mcpServers) {
    const servers = JSON.parse(readFileSync(join(root, compatibility.mcpServers), "utf8"));
    writeJson(join(root, "mcp.json"), { $schema: mcpSchema, mcpServers: portableServers(servers) });
  } else if (existsSync(join(root, "mcp.json"))) {
    throw new Error(`Unmapped portable MCP configuration for ${pluginName}`);
  }
}
