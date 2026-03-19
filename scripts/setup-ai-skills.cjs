/**
 * PowerBI Visuals Tools — AI Skills Setup Script
 *
 * Copies AI skill files into a Power BI visual project's
 * `.github/copilot/skills/` directory so that VS Code / GitHub Copilot
 * can discover them automatically.
 *
 * Runs in three scenarios:
 *   1. `postinstall` — when this package is installed as a dependency
 *      inside a visual project (`npm install powerbi-visuals-tools`).
 *   2. Manual CLI — `npx powerbi-visuals-tools-ai-setup` or
 *      `pbiviz setup-skills` from the visual project root.
 *   3. `pbiviz new` — skills are embedded in the _global template so
 *      new projects get them automatically (no script needed).
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------- path helpers ----------

const packageRoot = path.resolve(__dirname, "..");
const skillsSource = path.join(packageRoot, ".github", "skills");
/**
 * Find the consuming project root.
 *
 * When installed as a dependency the layout is:
 *   <project>/node_modules/powerbi-visuals-tools/scripts/setup-ai-skills.cjs
 *
 * When run directly from the repo (dev mode) or via `npx`, use either
 * the INIT_CWD env var (set by npm to the directory where `npm install`
 * was invoked) or fall back to process.cwd().
 */
function findProjectRoot() {
    const packageDir = path.resolve(__dirname, "..");

    // Check whether we live inside a node_modules tree
    const sep = path.sep;
    const parts = packageDir.split(sep);
    const nmIdx = parts.lastIndexOf("node_modules");

    if (nmIdx !== -1) {
        // Everything before `node_modules` is the project root
        return parts.slice(0, nmIdx).join(sep);
    }

    // Not inside node_modules — use INIT_CWD (npm sets this to the
    // directory where `npm install` / `npx` was executed) or cwd.
    return process.env.INIT_CWD || process.cwd();
}

// ---------- copy logic ----------

function copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function copySkills(targetRoot) {
    if (!fs.existsSync(skillsSource)) {
        return;
    }

    const skillDirs = fs.readdirSync(skillsSource, { withFileTypes: true })
        .filter((d) => d.isDirectory());

    if (skillDirs.length === 0) {
        return;
    }

    const targetDir = path.join(targetRoot, ".github","skills");
    fs.mkdirSync(targetDir, { recursive: true });

    let copiedCount = 0;

    for (const skillDir of skillDirs) {
        const srcDir = path.join(skillsSource, skillDir.name);
        const destDir = path.join(targetDir, skillDir.name);
        copyDirRecursive(srcDir, destDir);
        copiedCount++;
    }

    if (copiedCount > 0) {
        console.log(
            `[powerbi-visuals-tools] Installed ${copiedCount} AI skill(s) to ${path.relative(targetRoot, targetDir) || targetDir}`
        );
    }
}

// ---------- main ----------

try {
    const projectRoot = findProjectRoot();

    // Safety: only copy if the target looks like a real project
    // (has package.json or pbiviz.json) — avoids writing into random dirs.
    const hasPkg = fs.existsSync(path.join(projectRoot, "package.json"));
    const hasPbiviz = fs.existsSync(path.join(projectRoot, "pbiviz.json"));

    if (hasPkg || hasPbiviz) {
        copySkills(projectRoot);
    }
} catch (err) {
    // Non-fatal — never break npm install
    console.warn("[powerbi-visuals-tools] Could not set up AI skills:", err.message);
}
