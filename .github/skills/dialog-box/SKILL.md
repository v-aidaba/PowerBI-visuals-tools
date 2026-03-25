---
name: dialog-box
description: >
  Add Dialog Box (Modal Dialog) support to a Power BI custom visual.
  USE FOR: implementing openModalDialog, creating dialog visual components,
  configuring dialog capabilities, setting up IDialogCloseResult handling,
  creating dialog HTML pages, registering dialog visual classes.
  This skill generates all the code and configuration needed to display
  a modal dialog box from a Power BI custom visual.
---

# Power BI Visual — Dialog Box (Modal Dialog) Feature

## Overview

The Dialog Box (Modal Dialog) feature allows a Power BI custom visual to open a pop-up dialog window. The dialog runs as a separate visual instance inside a modal overlay. This is useful for showing detailed information, configuration forms, confirmations, or any interactive content that needs user attention.

**Official documentation:** https://learn.microsoft.com/en-us/power-bi/developer/visuals/create-display-dialog-box

## Requirements

- **API version:** 4.0 or higher (recommended: 5.3.0+)
- **powerbi-visuals-api** package must be installed
- The visual must use `IVisualHost.openModalDialog()` to trigger the dialog

## Architecture

A dialog box implementation consists of **two separate visuals**:

1. **Host Visual** – The main visual that calls `openModalDialog()` to open the dialog.
2. **Dialog Visual** – A separate visual class that renders inside the dialog window.

The dialog visual is registered as a separate class in the plugin file and referenced by its class name when calling `openModalDialog()`.

---

## Step-by-Step Implementation

### Step 1: Create the Dialog Visual Class

Create a new file `src/dialogVisual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;

/**
 * Dialog visual that renders inside the modal dialog window.
 * This is a separate visual class from the main (host) visual.
 */
export class DialogVisual implements IVisual {
    private target: HTMLElement;
    private dialogActionService: powerbi.extensibility.IDialogActionService;

    constructor(options: DialogConstructorOptions) {
        this.target = options.element;
        this.dialogActionService = options.actionService;
        this.renderDialogContent();
    }

    /**
     * Render the dialog UI content.
     * Customize this method to build your dialog interface.
     */
    private renderDialogContent(): void {
        // --- Container styles ---
        this.target.style.padding = "24px";
        this.target.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.target.style.display = "flex";
        this.target.style.flexDirection = "column";
        this.target.style.height = "100%";
        this.target.style.boxSizing = "border-box";
        this.target.style.color = "#333";

        // --- Title ---
        const title = document.createElement("h2");
        title.textContent = "Dialog Title";
        title.style.margin = "0 0 12px 0";
        title.style.fontSize = "20px";
        title.style.fontWeight = "600";
        title.style.color = "#1a1a1a";
        this.target.appendChild(title);

        // --- Description / informational content ---
        const description = document.createElement("p");
        description.textContent =
            "This dialog provides additional information about your Power BI visual. " +
            "You can use it to display instructions, configuration details, or any content " +
            "that requires the user's attention before proceeding.";
        description.style.margin = "0 0 8px 0";
        description.style.fontSize = "14px";
        description.style.lineHeight = "1.5";
        description.style.color = "#555";
        this.target.appendChild(description);

        // --- Additional content area ---
        const details = document.createElement("p");
        details.textContent =
            "Review the information above and click OK to confirm, or Close to dismiss this dialog.";
        details.style.margin = "0 0 16px 0";
        details.style.fontSize = "13px";
        details.style.lineHeight = "1.4";
        details.style.color = "#666";
        this.target.appendChild(details);

        // --- Spacer pushes buttons to the bottom ---
        const spacer = document.createElement("div");
        spacer.style.flex = "1";
        this.target.appendChild(spacer);

        // --- Button row ---
        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "flex-end";
        buttonRow.style.gap = "10px";
        buttonRow.style.borderTop = "1px solid #e0e0e0";
        buttonRow.style.paddingTop = "16px";

        // OK button – confirms the action and closes the dialog with a result
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.style.padding = "8px 24px";
        okButton.style.fontSize = "14px";
        okButton.style.fontWeight = "600";
        okButton.style.cursor = "pointer";
        okButton.style.border = "none";
        okButton.style.borderRadius = "4px";
        okButton.style.backgroundColor = "#0078d4";
        okButton.style.color = "#ffffff";
        okButton.addEventListener("click", () => {
            // Pass a result string back to the host visual
            this.dialogActionService.close("accepted");
        });
        buttonRow.appendChild(okButton);

        // Close button – dismisses the dialog without a result
        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.padding = "8px 24px";
        closeButton.style.fontSize = "14px";
        closeButton.style.fontWeight = "600";
        closeButton.style.cursor = "pointer";
        closeButton.style.border = "1px solid #8a8886";
        closeButton.style.borderRadius = "4px";
        closeButton.style.backgroundColor = "#ffffff";
        closeButton.style.color = "#333";
        closeButton.addEventListener("click", () => {
            this.dialogActionService.close("closed");
        });
        buttonRow.appendChild(closeButton);

        this.target.appendChild(buttonRow);
    }

    /**
     * update() is required by IVisual but is not called for dialog visuals.
     */
    public update(options: VisualUpdateOptions): void {
        // Dialog visuals do not receive data updates
    }
}
```

### Step 2: Update the Host Visual to Open the Dialog

In your main `src/visual.ts`, add the `openModalDialog()` call. Below is the minimal change needed:

```typescript
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DialogOpenOptions = powerbi.extensibility.visual.DialogOpenOptions;

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;

        // Example: add a button that opens the dialog
        const openDialogBtn = document.createElement("button");
        openDialogBtn.textContent = "Open Dialog";
        openDialogBtn.addEventListener("click", () => this.showDialog());
        this.target.appendChild(openDialogBtn);
    }

    private showDialog(): void {
        const dialogOptions: DialogOpenOptions = {
            title: "My Dialog",                  // Title shown in the dialog header
            size: 0,                             // DialogSize: 0 = Large, 1 = Small
            position: 0,                         // DialogPosition: 0 = Center
            dialogVisualClassName: "DialogVisual" // Must match the class name registered in the plugin
        };

        this.host.openModalDialog(
            dialogOptions.dialogVisualClassName,
            dialogOptions,
            dialogOptions.title
        ).then((result) => {
            // result.actionId contains the string passed to dialogActionService.close()
            console.log("Dialog closed with result:", result);
        }).catch((error) => {
            console.error("Dialog error:", error);
        });
    }

    public update(options: VisualUpdateOptions): void {
        // Your existing update logic
    }
}
```

### Step 3: Register the Dialog Visual in `pbiviz.json`

Add the `dialogVisual` section to your `pbiviz.json`:

```json
{
    "apiVersion": "5.3.0",
    "visual": {
        "name": "yourVisualName",
        "displayName": "Your Visual",
        "guid": "yourVisualGUID",
        "visualClassName": "Visual",
        "version": "1.0.0.0"
    },
    "dialogVisual": {
        "displayName": "DialogVisual",
        "visualClassName": "DialogVisual"
    }
}
```

**Key points:**

- `dialogVisual.visualClassName` must exactly match the exported class name in `src/dialogVisual.ts`.
- `dialogVisual.displayName` is a friendly label for the dialog visual.

### Step 4: Update `tsconfig.json`

Add the dialog visual file to the `files` array in `tsconfig.json`:

```json
{
    "compilerOptions": {
        "allowJs": false,
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "target": "es2022",
        "sourceMap": true,
        "outDir": "./.tmp/build/",
        "moduleResolution": "node",
        "declaration": true,
        "lib": ["es2022", "dom"]
    },
    "files": [
        "./src/visual.ts",
        "./src/dialogVisual.ts"
    ]
}
```

### Step 5: Add the `openModalDialog` Privilege in `capabilities.json`

Add the `WebAccess` privilege with `openModalDialog` to your `capabilities.json`:

```json
{
    "dataRoles": [ ... ],
    "dataViewMappings": [ ... ],
    "privileges": [
        {
            "name": "WebAccess",
            "essential": true,
            "parameters": [
                "openModalDialog"
            ]
        }
    ]
}
```

If you already have a `privileges` array, add the `WebAccess` entry to it. The `"openModalDialog"` parameter is **required** — without it the dialog will be blocked.

---

## Dialog Options Reference

| Property | Type | Description |
|---|---|---|
| `title` | `string` | The title bar text of the dialog |
| `size` | `number` | `0` = Large (600×400), `1` = Small (400×300) |
| `position` | `number` | `0` = Center (only option currently) |
| `dialogVisualClassName` | `string` | Class name of the dialog visual (must match plugin registration) |

## DialogConstructorOptions (received by the dialog visual)

| Property | Type | Description |
|---|---|---|
| `element` | `HTMLElement` | The DOM element for the dialog visual to render into |
| `actionService` | `IDialogActionService` | Service to close the dialog and return a result |

## IDialogActionService

| Method | Description |
|---|---|
| `close(resultPayload: string)` | Closes the dialog and returns the result string to the host visual |

## IDialogCloseResult (received by the host visual)

| Property | Type | Description |
|---|---|---|
| `actionId` | `string` | The result string passed to `close()` |

---

## Passing Data Between Host and Dialog

The dialog visual does **not** receive dataViews. To pass initial data to the dialog:

1. Use `window.localStorage` or `sessionStorage` to share data between host and dialog (they share the same origin).
2. Set data before calling `openModalDialog()` and read it in the dialog constructor.

```typescript
// In host visual (before opening dialog):
sessionStorage.setItem("dialogData", JSON.stringify({ key: "value" }));

// In dialog visual constructor:
const data = JSON.parse(sessionStorage.getItem("dialogData") || "{}");
```

**Important:** Always clear sensitive data from storage after the dialog closes.

---

## Common Patterns

### Confirmation Dialog

```typescript
private async confirmAction(): Promise<boolean> {
    try {
        const result = await this.host.openModalDialog(
            "DialogVisual",
            { title: "Confirm Action", size: 1, position: 0, dialogVisualClassName: "DialogVisual" },
            "Confirm Action"
        );
        return result?.actionId === "accepted";
    } catch {
        return false;
    }
}
```

### Settings / Configuration Dialog

Build a form in the dialog visual, collect values, serialize them (e.g., JSON string), and pass via `dialogActionService.close(jsonString)`. The host then parses the result:

```typescript
// In the dialog visual — serialize form data on OK click:
okButton.addEventListener("click", () => {
    const formData = { name: nameInput.value, color: colorPicker.value };
    this.dialogActionService.close(JSON.stringify(formData));
});

// In the host visual — parse the result:
this.host.openModalDialog(...).then((result) => {
    if (result.actionId && result.actionId !== "closed") {
        const formData = JSON.parse(result.actionId);
        console.log("User submitted:", formData);
    }
});
```

### Result Values

The dialog returns these result strings via `IDialogCloseResult.actionId`:

| Button clicked | `actionId` value |
|---|---|
| OK | `"accepted"` |
| Close | `"closed"` |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Dialog doesn't open | Ensure `"openModalDialog"` is in `capabilities.json` privileges |
| `openModalDialog is not a function` | Update `powerbi-visuals-api` to version 4.0+ |
| Dialog opens but is blank | Verify `dialogVisualClassName` in `pbiviz.json` matches the class name |
| Dialog visual not found | Make sure dialog class is exported and in `tsconfig.json` files array |
| Result is undefined | Ensure dialog calls `dialogActionService.close("value")` before closing |
| Only Close button works | Make sure both button click handlers call `dialogActionService.close()` |

---

## File Checklist

When implementing Dialog Box support, ensure these files are created/updated:

- [ ] `src/dialogVisual.ts` — **New file**: Dialog visual class
- [ ] `src/visual.ts` — **Updated**: Add `openModalDialog()` call
- [ ] `pbiviz.json` — **Updated**: Add `dialogVisual` section
- [ ] `tsconfig.json` — **Updated**: Add `./src/dialogVisual.ts` to files array
- [ ] `capabilities.json` — **Updated**: Add `WebAccess` privilege with `openModalDialog`
