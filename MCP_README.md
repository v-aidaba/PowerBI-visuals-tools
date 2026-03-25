# Power BI Visuals MCP (Model Context Protocol) Server

This document explains how to use the MCP server to add features like modal dialogs and warning icons to your Power BI visuals through AI assistants.

## Overview

The Power BI Visuals MCP Server provides AI assistants with tools to:
- List available Power BI visual features
- Add features like modal dialogs and warning icons to visual projects
- Validate features in existing visuals
- Get documentation and implementation guidance

## Setup

### 1. Initialize MCP in your visual project

Run the following command in your visual project directory:

```bash
npx pbiviz mcp --init
```

This creates a `.vscode/mcp.json` file with the proper configuration.

### 2. Start the MCP server

```bash
npx pbiviz mcp
```

The server runs on stdio and can be connected to by MCP-compatible AI assistants.

## Available MCP Tools

### 1. `list_available_features`
Lists all available Power BI visual features that can be added to your project.

**Usage in AI assistant:**
```
List all available Power BI visual features
```

### 2. `get_feature_documentation`
Gets documentation and implementation details for a specific feature.

**Parameters:**
- `featureName`: Name of the feature to get documentation for

**Usage in AI assistant:**
```
Show me how to implement modal dialog in Power BI visuals
```

### 3. `add_dialog_box`
Adds a modal dialog box feature to your Power BI visual project (hardcoded implementation).

**Parameters:**
- `visualPath`: Path to your visual project directory
- `dialogTitle` (optional): Title for the dialog box
- `generateExample` (optional): Whether to generate example code

**Usage in AI assistant:**
```
Add dialog box to my visual project at ./my-visual/
```

### 4. `validate_visual_features` 
Validates the features used in your Power BI visual project.

**Parameters:**
- `visualPath`: Path to your visual project directory  
- `stage` (optional): Validation stage ("pre-build" or "post-build")

**Usage in AI assistant:**
```
Validate the features in my visual project at ./my-visual/
```

### 5. `list_available_skills` ⭐ NEW
Discovers all available AI skills from the skills repository. Each skill is a self-contained SKILL.md file with step-by-step instructions for implementing a feature in a Power BI visual project.

**Usage in AI assistant:**
```
What skills are available for Power BI visuals?
```

### 6. `get_skill_instructions` ⭐ NEW
Gets the full implementation guide (SKILL.md content) for a specific skill. The AI agent can follow these instructions to implement the feature in any visual project.

**Parameters:**
- `skillName`: Name of the skill (e.g., "dialog-box", "warning-icon")

**Usage in AI assistant:**
```
Add a dialog box to my visual
Get instructions for adding a warning icon to my visual
```

## Skill-Based Feature Implementation

The MCP server now supports a **skill-driven approach** to adding features. Instead of hardcoded implementations, AI skills are defined as SKILL.md files in the `.github/skills/` directory of the tools package.

### How It Works

1. **User asks**: "Add a dialog box to my Aster Plot visual"
2. **AI agent calls** `list_available_skills` → discovers available skills
3. **AI agent calls** `get_skill_instructions("dialog-box")` → gets the full SKILL.md
4. **AI agent follows** the step-by-step instructions to implement the feature in the target project

### Benefits

- **No code changes needed** — new features are added by creating a new SKILL.md file
- **Full context** — each skill contains complete code templates, configuration changes, and best practices
- **AI-native** — instructions are written for AI agents to follow precisely
- **Extensible** — works with local skills now, will support remote repository skills later

### Current Skills

| Skill | Description |
|-------|-------------|
| `dialog-box` | Add modal dialog box support (openModalDialog, dialog visual, capabilities) |
| `warning-icon` | Add warning icon using displayWarningIcon API |

### Adding New Skills

Create a new directory under `.github/skills/` with a `SKILL.md` file:

```
.github/skills/
├── dialog-box/
│   └── SKILL.md
├── warning-icon/
│   └── SKILL.md
└── your-new-skill/
    └── SKILL.md
```

The SKILL.md file must have YAML frontmatter with `name` and `description`:

```markdown
---
name: your-new-skill
description: Brief description of what this skill does
---

# Skill Title

## Step-by-step instructions...
```

## Feature Examples

### Modal Dialog

The modal dialog feature allows your visual to display dialog boxes to users.

**Generated files:**
- `src/modalDialog.ts`: Helper class for modal dialog operations

**Key methods:**
```typescript
// Show simple dialog
ModalDialogHelper.showDialog(host, "Title", "Content");

// Show custom dialog
ModalDialogHelper.showCustomDialog(host, {
    title: "Custom Dialog",
    content: "Custom content",
    buttonText: "Close"
});
```

**Requirements:**
- PowerBI API version 2.3.0 or higher
- Access to IVisualHost interface

### Warning Icon

The warning icon feature allows your visual to display warning messages to users.

**Generated files:**
- `src/warningIcon.ts`: Helper class for warning icon operations

**Key methods:**
```typescript
// Display simple warning
WarningIconHelper.displayWarning(host, "Warning message");

// Display custom warning
WarningIconHelper.displayCustomWarning(host, {
    message: "Custom warning message",
    title: "Warning"
});
```

**Requirements:**
- PowerBI API version 1.7.0 or higher
- Access to IVisualHost interface

## Integration with Visual Code

When you add features through the MCP server, you'll typically need to:

1. **Import the generated helper classes** in your main visual file (`src/visual.ts`)
2. **Update capabilities.json** if the feature requires new capabilities
3. **Call feature methods** in appropriate parts of your visual lifecycle
4. **Test the functionality** thoroughly

## Example Visual Integration

```typescript
// src/visual.ts
import { ModalDialogHelper } from './modalDialog';
import { WarningIconHelper } from './warningIcon';

export class Visual implements IVisual {
    private host: IVisualHost;
    
    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
    }
    
    public update(options: VisualUpdateOptions) {
        // Show warning if no data
        if (!options.dataViews || options.dataViews.length === 0) {
            WarningIconHelper.displayWarning(
                this.host, 
                "No data available"
            );
            return;
        }
        
        // Show dialog on specific user interaction
        if (this.shouldShowDialog(options)) {
            ModalDialogHelper.showDialog(
                this.host,
                "Information", 
                "Additional details about your visual"
            );
        }
        
        // Rest of your visual update logic...
    }
    
    private shouldShowDialog(options: VisualUpdateOptions): boolean {
        // Your logic to determine when to show dialog
        return false;
    }
}
```

## Supported Features

The MCP server currently supports the following Power BI visual features:

- **Modal Dialog**: Display dialog boxes
- **Warning Icon**: Show warning messages  
- **Advanced Edit Mode**: Enhanced editing capabilities
- **Allow Interactions**: Enable visual interactions
- **Analytics Pane**: Analytics functionality
- **Bookmarks**: Bookmark support
- **Color Palette**: Custom color palettes
- **Conditional Formatting**: Format based on conditions
- **Context Menu**: Custom context menus
- **Drill Down**: Hierarchical data drilling
- **Fetch More Data**: Load additional data
- **File Download**: Download functionality
- **Format Pane**: Custom format pane
- **High Contrast**: Accessibility support
- **Highlight Data**: Data highlighting
- **Keyboard Navigation**: Keyboard accessibility
- **Landing Page**: Welcome screens
- **Launch URL**: Open external URLs
- **Localizations**: Multi-language support
- **Local Storage**: Client-side storage
- **Rendering Events**: Custom rendering
- **Selection Across Visuals**: Cross-visual selection
- **Sync Slicer**: Synchronized filtering
- **Tooltips**: Custom tooltips
- **Total Sub Total**: Aggregation features

## Troubleshooting

### MCP Server Not Starting
- Ensure you have Node.js 18.0.0 or higher installed
- Run `npm install` to ensure all dependencies are available
- Check that the `@modelcontextprotocol/sdk` package is installed

### Features Not Being Added
- Verify the visual project path is correct
- Ensure the feature name matches exactly (case-sensitive)
- Check that your visual project has the required structure (src/, pbiviz.json, etc.)

### Validation Errors
- Features may require specific API versions
- Some features need additional capabilities in capabilities.json
- Ensure your visual implements the IVisual interface correctly

## Advanced Usage

### Custom Feature Templates

You can extend the MCP server by adding custom feature templates in the `src/mcp/tools/` directory. Each feature tool should implement:

1. **Feature detection logic** (checking if feature is already implemented)
2. **Code generation** (creating the necessary TypeScript/JavaScript files)  
3. **Configuration updates** (modifying capabilities.json or other config files)
4. **Documentation** (providing implementation guidance)

### Integration with CI/CD

The MCP validation tools can be integrated into your build pipeline:

```bash
# Validate features before building
npx pbiviz mcp validate --path ./my-visual --stage pre-build

# Build visual if validation passes
npx pbiviz package
```

## Support

For issues with the MCP server or feature implementation:
1. Check the generated code carefully
2. Refer to the official Power BI Visual API documentation
3. Test features in isolation before integrating
4. Use the validation tools to identify configuration issues