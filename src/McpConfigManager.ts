import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

export const MCP_SERVER_NAME = "pbiviz";

const MCP_SERVER_ENTRY = {
    command: "npx",
    args: ["-y", "powerbi-visuals-tools", "mcp"]
};

/**
 * Where the MCP server should be registered:
 * - "local": the tool is a project dependency, configure project-scoped files only.
 * - "global": the tool is installed globally, it may be registered in the user's
 *   global AI-agent configuration so it is available across all projects.
 */
export type InstallScope = "global" | "local";

/** The JSON key under which MCP servers are stored differs between AI agents. */
type ServerKey = "servers" | "mcpServers";

export interface AgentDefinition {
    /** Stable identifier (used by `--agent <id>`). */
    id: string;
    /** Human-friendly name shown to the user. */
    name: string;
    /** JSON key the agent expects servers to be registered under. */
    serverKey: ServerKey;
    /** Config file path relative to the project root (project scope). */
    projectConfig?: string;
    /**
     * Paths relative to the project root whose presence indicates the agent is
     * used in this project (so we only touch configs the user actually needs).
     */
    projectMarkers: string[];
    /** Config file path relative to the user's home dir (global scope). */
    globalConfig?: string;
    /**
     * Paths relative to the user's home dir whose presence indicates the agent
     * is installed for the current user.
     */
    globalMarkers?: string[];
    /**
     * Resolver for agents whose global config path is platform specific
     * (e.g. VS Code). Takes precedence over `globalConfig` when present.
     */
    resolveGlobalConfig?: () => string;
}

/**
 * Resolves the platform-specific VS Code user-level MCP config file.
 */
function vscodeUserMcpPath(): string {
    const home = homedir();
    if (process.platform === "win32") {
        const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
        return join(appData, "Code", "User", "mcp.json");
    }
    if (process.platform === "darwin") {
        return join(home, "Library", "Application Support", "Code", "User", "mcp.json");
    }
    return join(home, ".config", "Code", "User", "mcp.json");
}

/**
 * Registry of known AI agents and how their MCP configuration is shaped.
 * Adding support for a new agent is just a new entry here — no other code
 * needs to change.
 */
export const AGENTS: AgentDefinition[] = [
    {
        id: "vscode",
        name: "VS Code (GitHub Copilot)",
        serverKey: "servers",
        projectConfig: join(".vscode", "mcp.json"),
        projectMarkers: [".vscode"],
        resolveGlobalConfig: vscodeUserMcpPath,
        globalMarkers: [".vscode"]
    },
    {
        id: "cursor",
        name: "Cursor",
        serverKey: "mcpServers",
        projectConfig: join(".cursor", "mcp.json"),
        projectMarkers: [".cursor"],
        globalConfig: join(".cursor", "mcp.json"),
        globalMarkers: [".cursor"]
    },
    {
        id: "claude",
        name: "Claude Code",
        serverKey: "mcpServers",
        projectConfig: ".mcp.json",
        projectMarkers: [".mcp.json", ".claude", "CLAUDE.md"],
        globalConfig: ".claude.json",
        globalMarkers: [".claude.json", ".claude"]
    },
    {
        id: "gemini",
        name: "Gemini CLI",
        serverKey: "mcpServers",
        projectConfig: join(".gemini", "settings.json"),
        projectMarkers: [".gemini", "GEMINI.md"],
        globalConfig: join(".gemini", "settings.json"),
        globalMarkers: [".gemini"]
    },
    {
        id: "windsurf",
        name: "Windsurf",
        serverKey: "mcpServers",
        projectConfig: join(".windsurf", "mcp.json"),
        projectMarkers: [".windsurf"],
        globalConfig: join(".codeium", "windsurf", "mcp_config.json"),
        globalMarkers: [join(".codeium", "windsurf")]
    }
];

const DEFAULT_AGENT_ID = "vscode";

export interface ConfigureResult {
    status: "created" | "added" | "already-exists";
    message: string;
}

export interface AgentConfigureResult extends ConfigureResult {
    agentId: string;
    agentName: string;
    scope: InstallScope;
    configPath: string;
}

export interface ConfigureMcpOptions {
    /** Project directory. Defaults to the current working directory. */
    projectDir?: string;
    /** Force a scope. When omitted, it is auto-detected from the install location. */
    scope?: InstallScope;
    /** Restrict configuration to specific agent ids. When omitted, agents are detected. */
    agentIds?: string[];
}

export interface ConfigureMcpResult {
    scope: InstallScope;
    results: AgentConfigureResult[];
}

/**
 * Returns the root directory of the installed powerbi-visuals-tools package.
 * This file is emitted to `<root>/lib/McpConfigManager.js`, so the package
 * root is two levels up.
 */
function packageRootDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return dirname(here);
}

function normalize(p: string): string {
    return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/**
 * Detects whether the tool is installed as a project dependency ("local") or
 * globally ("global") by checking where the running package lives relative to
 * the given project's `node_modules`.
 */
export function detectInstallScope(projectDir: string = process.cwd()): InstallScope {
    const pkgDir = normalize(packageRootDir());
    const localNodeModules = normalize(join(projectDir, "node_modules"));
    return pkgDir.startsWith(localNodeModules + "/") || pkgDir === localNodeModules
        ? "local"
        : "global";
}

function getAgentById(id: string): AgentDefinition | undefined {
    return AGENTS.find(a => a.id === id);
}

/**
 * Resolves the absolute config file path for an agent in a given scope.
 * Returns null when the agent has no config file for that scope.
 */
export function getAgentConfigPath(
    agent: AgentDefinition,
    scope: InstallScope,
    projectDir: string = process.cwd()
): string | null {
    if (scope === "local") {
        return agent.projectConfig ? join(projectDir, agent.projectConfig) : null;
    }
    if (agent.resolveGlobalConfig) {
        return agent.resolveGlobalConfig();
    }
    return agent.globalConfig ? join(homedir(), agent.globalConfig) : null;
}

/**
 * Detects which agents are used in a project based on marker files/folders.
 */
export function detectProjectAgents(projectDir: string = process.cwd()): AgentDefinition[] {
    return AGENTS.filter(agent =>
        agent.projectMarkers.some(marker => existsSync(join(projectDir, marker)))
    );
}

/**
 * Detects which agents are installed for the current user based on markers in
 * the home directory.
 */
export function detectGlobalAgents(): AgentDefinition[] {
    const home = homedir();
    return AGENTS.filter(agent => {
        const markers = agent.globalMarkers ?? [];
        if (markers.some(marker => existsSync(join(home, marker)))) {
            return true;
        }
        // Also treat an already-existing global config file as a signal.
        const configPath = getAgentConfigPath(agent, "global");
        return !!configPath && existsSync(configPath);
    });
}

/**
 * Checks whether the pbiviz MCP server is already registered in a config file.
 */
function hasServerEntry(configPath: string, serverKey: ServerKey): boolean {
    if (!existsSync(configPath)) {
        return false;
    }
    try {
        const parsed = JSON.parse(readFileSync(configPath, "utf-8"));
        const servers = parsed?.[serverKey];
        return !!(servers && typeof servers === "object" && servers[MCP_SERVER_NAME]);
    } catch {
        return false;
    }
}

/**
 * Writes the pbiviz MCP server entry into a config file, preserving everything
 * already there. Never overwrites an existing pbiviz entry (it may be
 * user-customized).
 */
function writeServerEntry(configPath: string, serverKey: ServerKey): ConfigureResult {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    const fileExisted = existsSync(configPath);

    if (fileExisted) {
        try {
            const existing = JSON.parse(readFileSync(configPath, "utf-8"));
            if (existing && typeof existing === "object") {
                config = existing;
            }
        } catch {
            // Corrupted JSON — start fresh rather than crash.
            config = {};
        }
    }

    if (!config[serverKey] || typeof config[serverKey] !== "object") {
        config[serverKey] = {};
    }

    const servers = config[serverKey] as Record<string, unknown>;

    if (servers[MCP_SERVER_NAME]) {
        return {
            status: "already-exists",
            message: `MCP server '${MCP_SERVER_NAME}' is already configured in ${configPath}`
        };
    }

    servers[MCP_SERVER_NAME] = MCP_SERVER_ENTRY;
    writeFileSync(configPath, JSON.stringify(config, null, 4), "utf-8");

    return {
        status: fileExisted ? "added" : "created",
        message: fileExisted
            ? `Added '${MCP_SERVER_NAME}' to existing ${configPath}`
            : `Created ${configPath}`
    };
}

/**
 * Resolves the target agents for a configuration run.
 */
function resolveTargetAgents(
    projectDir: string,
    scope: InstallScope,
    agentIds?: string[]
): AgentDefinition[] {
    if (agentIds && agentIds.length > 0) {
        return agentIds
            .map(getAgentById)
            .filter((a): a is AgentDefinition => !!a);
    }

    const detected = scope === "local" ? detectProjectAgents(projectDir) : detectGlobalAgents();
    if (detected.length > 0) {
        return detected;
    }

    // Fall back to a sensible default so the command always does something useful.
    const fallback = getAgentById(DEFAULT_AGENT_ID);
    return fallback ? [fallback] : [];
}

/**
 * High-level entry point: detects scope and agents (unless overridden) and
 * registers the pbiviz MCP server in every relevant config file.
 */
export function configureMcp(options: ConfigureMcpOptions = {}): ConfigureMcpResult {
    const projectDir = options.projectDir ?? process.cwd();
    const scope = options.scope ?? detectInstallScope(projectDir);
    const agents = resolveTargetAgents(projectDir, scope, options.agentIds);

    const results: AgentConfigureResult[] = [];
    for (const agent of agents) {
        const configPath = getAgentConfigPath(agent, scope, projectDir);
        if (!configPath) {
            continue;
        }
        const result = writeServerEntry(configPath, agent.serverKey);
        results.push({
            ...result,
            agentId: agent.id,
            agentName: agent.name,
            scope,
            configPath
        });
    }

    return { scope, results };
}

/**
 * Returns true if the pbiviz MCP server is configured for any detected agent in
 * the project.
 */
export function isAnyAgentConfigured(projectDir: string = process.cwd()): boolean {
    return AGENTS.some(agent => {
        const configPath = getAgentConfigPath(agent, "local", projectDir);
        return !!configPath && hasServerEntry(configPath, agent.serverKey);
    });
}

/**
 * Backward-compatible check: is the server configured in VS Code's project
 * `.vscode/mcp.json`?
 */
export function isServerConfigured(projectDir: string): boolean {
    return hasServerEntry(join(projectDir, ".vscode", "mcp.json"), "servers");
}

/**
 * Backward-compatible helper that configures only the VS Code project config.
 * Prefer {@link configureMcp} for scope/agent-aware behavior.
 */
export function configureMcpConfig(projectDir: string): ConfigureResult {
    return writeServerEntry(join(projectDir, ".vscode", "mcp.json"), "servers");
}

export const MCP_NEXT_STEPS = [
    "Next steps:",
    "1. Restart your AI tool to activate the MCP server",
    "2. Open the AI chat and ask questions like:",
    '   - "Check my visual for certification readiness"',
    '   - "What are the best practices for Power BI visuals?"',
    '   - "Show me available APIs for tooltips"',
];
