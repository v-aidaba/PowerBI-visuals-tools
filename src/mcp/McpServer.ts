"use strict";

import { McpServer as MCPServerSDK } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import ConsoleWriter from "../ConsoleWriter.js";
import { SkillTool } from "./tools/SkillTool.js";


export class McpServer {
    private server: MCPServerSDK;
    private rootPath: string;
    private skillTool: SkillTool;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.skillTool = new SkillTool();
        this.server = new MCPServerSDK({
            name: "pbiviz-mcp-server",
            version: "1.0.0",
        });

        this.registerTools();
    }

    private registerTools() {
        // Tool 1: List available skills
        this.server.tool(
            "list_available_skills",
            "List all available AI skills for implementing Power BI visual features. Each skill contains step-by-step instructions, code templates, and configuration changes needed to add a feature (e.g., dialog box, warning icon) to a visual project. When a user asks to add a feature, call this first to discover available skills.",
            {},
            async () => {
                return this.skillTool.listAvailableSkills() as any;
            }
        );

        // Tool 2: Get skill instructions
        this.server.tool(
            "get_skill_instructions",
            "Get the full implementation instructions for a specific skill. Returns the complete SKILL.md content with step-by-step guide, code templates, and configuration changes needed to implement the feature in a Power BI visual project. The AI agent should follow these instructions to add the feature.",
            {
                skillName: z.string().describe("Name of the skill to get instructions for (e.g., 'dialog-box', 'warning-icon'). Use list_available_skills to see available skills.")
            } as any,
            async ({ skillName }: { skillName: string }) => {
                return this.skillTool.getSkillInstructions(skillName) as any;
            }
        );
    }

    public async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        // Keep the server running
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
}

export async function startMcpServer(rootPath: string) {
    const server = new McpServer(rootPath);
    await server.start();
}

const MCP_CONFIG = {
    servers: {
        pbiviz: {
            command: "npx",
            args: ["pbiviz", "mcp"]
        }
    }
};

export async function initMcpConfig(rootPath: string) {
    const vscodeDir = path.join(rootPath, ".vscode");
    const mcpConfigPath = path.join(vscodeDir, "mcp.json");

    try {
        // Check if mcp.json already exists
        if (fs.existsSync(mcpConfigPath)) {
            ConsoleWriter.warning("MCP configuration already exists at .vscode/mcp.json");
            ConsoleWriter.info("To reconfigure, delete the file and run this command again.");
            return;
        }

        // Create .vscode directory if it doesn't exist
        fs.ensureDirSync(vscodeDir);

        // Write mcp.json
        fs.writeJsonSync(mcpConfigPath, MCP_CONFIG, { spaces: 4 });

        ConsoleWriter.done("MCP configuration created successfully!");
        ConsoleWriter.blank();
        ConsoleWriter.info("Created: .vscode/mcp.json");
        ConsoleWriter.blank();
        ConsoleWriter.info("Next steps:");
        ConsoleWriter.info("1. Restart VS Code to activate MCP server");
        ConsoleWriter.info("2. Open Copilot Chat and ask questions like:");
        ConsoleWriter.info('   - "Check my visual for certification readiness"');
        ConsoleWriter.info('   - "What are the best practices for Power BI visuals?"');
        ConsoleWriter.info('   - "Show me available APIs for tooltips"');
        ConsoleWriter.blank();
    } catch (error) {
        ConsoleWriter.error(`Failed to create MCP configuration: ${error.message}`);
        process.exit(1);
    }
}