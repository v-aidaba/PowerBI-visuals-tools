"use strict";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "node:url";

export interface SkillInfo {
    name: string;
    description: string;
    directory: string;
}

export class SkillTool {
    private skillsDir: string;

    constructor() {
        // Resolve package root from this file's location using ESM-compatible approach
        // At runtime this file is at <package_root>/lib/mcp/tools/SkillTool.js
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        this.skillsDir = path.resolve(currentDir, "..", "..", "..", ".github", "skills");
    }

    /**
     * List all available skills by scanning the skills directory.
     * Each skill is a subdirectory containing a SKILL.md file.
     */
    public listAvailableSkills(): object {
        if (!fs.existsSync(this.skillsDir)) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        message: "No skills directory found",
                        skills: []
                    }, null, 2)
                }]
            };
        }

        const skills = this.discoverSkills();

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    message: "Available Power BI Visual Skills",
                    description: "Each skill contains step-by-step instructions for implementing a feature. Use get_skill_instructions to get the full implementation guide for a specific skill.",
                    skills: skills.map(s => ({
                        name: s.name,
                        description: s.description,
                        directory: s.directory
                    }))
                }, null, 2)
            }]
        };
    }

    /**
     * Get the full SKILL.md content for a specific skill.
     * Returns the complete implementation instructions that the AI agent can follow
     * to add the feature to a visual project.
     */
    public getSkillInstructions(skillName: string): object {
        const skill = this.findSkill(skillName);
        if (!skill) {
            const available = this.discoverSkills().map(s => s.name);
            throw new Error(
                `Skill "${skillName}" not found. Available skills: ${available.join(", ")}. ` +
                `Use list_available_skills to see all available skills.`
            );
        }

        const skillMdPath = path.join(this.skillsDir, skill.directory, "SKILL.md");
        const content = fs.readFileSync(skillMdPath, "utf-8");

        // Also collect any additional files in the skill directory (templates, examples, etc.)
        const additionalFiles = this.getAdditionalSkillFiles(skill.directory);

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    skillName: skill.name,
                    description: skill.description,
                    instructions: content,
                    additionalFiles: additionalFiles.length > 0 ? additionalFiles : undefined,
                    usage: "Follow the instructions in the 'instructions' field to implement this feature in the target visual project. The instructions contain all necessary code templates, configuration changes, and step-by-step guidance."
                }, null, 2)
            }]
        };
    }

    /**
     * Discover all skills in the skills directory.
     */
    private discoverSkills(): SkillInfo[] {
        if (!fs.existsSync(this.skillsDir)) return [];

        const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
        const skills: SkillInfo[] = [];

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const skillMdPath = path.join(this.skillsDir, entry.name, "SKILL.md");
            if (!fs.existsSync(skillMdPath)) continue;

            const { name, description } = this.parseSkillFrontmatter(skillMdPath);
            skills.push({
                name: name || entry.name,
                description: description || "",
                directory: entry.name
            });
        }

        return skills;
    }

    /**
     * Find a skill by name (matches directory name or frontmatter name, case-insensitive).
     */
    private findSkill(skillName: string): SkillInfo | null {
        const skills = this.discoverSkills();
        const lower = skillName.toLowerCase();

        return skills.find(s =>
            s.directory.toLowerCase() === lower ||
            s.name.toLowerCase() === lower
        ) || null;
    }

    /**
     * Get any additional files in a skill directory (besides SKILL.md).
     * These might be templates, examples, or supplementary docs.
     */
    private getAdditionalSkillFiles(directory: string): Array<{ filename: string; content: string }> {
        const skillDir = path.join(this.skillsDir, directory);
        const files: Array<{ filename: string; content: string }> = [];

        const entries = fs.readdirSync(skillDir);
        for (const entry of entries) {
            if (entry === "SKILL.md") continue;

            const filePath = path.join(skillDir, entry);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                files.push({
                    filename: entry,
                    content: fs.readFileSync(filePath, "utf-8")
                });
            }
        }

        return files;
    }

    /**
     * Parse YAML frontmatter from a SKILL.md file to extract name and description.
     * Handles both single-line and multi-line (block scalar) YAML values.
     */
    private parseSkillFrontmatter(filePath: string): { name: string; description: string } {
        const content = fs.readFileSync(filePath, "utf-8");
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            return { name: "", description: "" };
        }

        const frontmatter = frontmatterMatch[1];

        // Extract name
        const nameMatch = frontmatter.match(/^name:\s*(.+)/m);
        const name = nameMatch ? nameMatch[1].trim() : "";

        // Extract description — handle block scalar (> or |) and simple single-line
        let description = "";
        const blockDescMatch = frontmatter.match(/^description:\s*[>|]-?\s*\n([\s\S]*?)(?=\n[a-zA-Z]|\s*$)/m);
        if (blockDescMatch) {
            description = blockDescMatch[1]
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join(" ");
        } else {
            const simpleDescMatch = frontmatter.match(/^description:\s*(.+)/m);
            if (simpleDescMatch) {
                description = simpleDescMatch[1].trim();
            }
        }

        return { name, description };
    }
}
