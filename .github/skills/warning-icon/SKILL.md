---
name: warning-icon
description: Add a Warning Icon to a Power BI custom visual to alert users about data quality, missing fields, or other issues using the official displayWarningIcon API.
---

# Warning Icon Skill

## When to use this skill

Use this skill when the developer asks to:

- add a warning icon
- show a warning indicator
- display a warning on the visual
- alert users about data issues
- show a data quality warning
- add an exclamation mark / warning triangle to the visual header
- notify users of missing or invalid data

## Goal

Implement a warning icon in a Power BI custom visual using the official `displayWarningIcon` API from `IVisualHost`.

The warning icon appears in the visual header bar (top-right corner) and shows a tooltip message when hovered. This is the standard Power BI pattern for communicating non-blocking issues to report consumers.

## Core rules

- Always use the official `IVisualHost.displayWarningIcon()` method.
- Do not draw a custom warning icon inside the visual canvas unless the developer explicitly asks for a non-official approach.
- Keep the implementation minimal and aligned with the current project structure.
- Reuse existing helpers, styles, and UI patterns where possible.
- Do not refactor unrelated files.
- At the end, summarize which files were created or updated.

## Required implementation approach

When implementing the warning icon:

1. Inspect the existing project structure first.
2. Verify that the current `powerbi-visuals-api` version supports `displayWarningIcon` (API 2.6.0+, recommended 5.3.0+).
3. Store the `IVisualHost` reference from `VisualConstructorOptions` in the constructor.
4. In the `update()` method, evaluate the condition that should trigger the warning.
5. Call `this.host.displayWarningIcon(title, detailedMessage)` when the condition is met.
6. Update only the required code files.

## Implementation details

### API signature

```typescript
IVisualHost.displayWarningIcon(title: string, detailedMessage: string): void
```

| Parameter | Type | Description |
|---|---|---|
| `title` | `string` | Short warning title shown in bold in the tooltip |
| `detailedMessage` | `string` | Longer explanation shown below the title in the tooltip |

### Minimal code example

In `src/visual.ts`:

```typescript
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
    }

    public update(options: VisualUpdateOptions): void {
        // Example: warn when no data is provided
        const dataView = options.dataViews && options.dataViews[0];

        if (!dataView || !dataView.categorical || !dataView.categorical.values) {
            this.host.displayWarningIcon(
                "No data available",
                "Add a measure to the Values field to display this visual."
            );
            return;
        }

        // Your normal rendering logic here
    }
}
```

### Common warning scenarios

Use `displayWarningIcon` for conditions like:

| Scenario | Title example | Message example |
|---|---|---|
| No data bound | `"No data available"` | `"Drag a measure into the Values field well."` |
| Missing required field | `"Missing required field"` | `"The Category field is required for this visual."` |
| Data exceeds row limit | `"Data truncated"` | `"Only the first 1000 rows are shown. Apply filters to reduce data."` |
| Negative values unsupported | `"Unsupported values"` | `"This visual does not support negative values. Negative values are excluded."` |
| Deprecated configuration | `"Configuration warning"` | `"The current settings use a deprecated option. Please update your configuration."` |

### Pattern for conditional warnings

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];
    const categorical = dataView?.categorical;

    // Check for missing category field
    if (!categorical?.categories || categorical.categories.length === 0) {
        this.host.displayWarningIcon(
            "Missing required field",
            "Please add a field to the Category data role."
        );
    }

    // Check for missing measure field
    if (!categorical?.values || categorical.values.length === 0) {
        this.host.displayWarningIcon(
            "Missing measure",
            "Please add at least one measure to the Values data role."
        );
    }

    // Proceed with rendering if data is valid
    if (categorical?.categories?.length > 0 && categorical?.values?.length > 0) {
        this.renderVisual(categorical);
    }
}
```

### Clearing the warning icon

The warning icon is automatically cleared when a new `update()` cycle runs without calling `displayWarningIcon()`. There is no explicit "clear" method — simply do not call it when conditions are normal.

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews?.[0];

    if (!dataView) {
        // Show warning — icon appears
        this.host.displayWarningIcon("No data", "Please add data fields.");
        return;
    }

    // No displayWarningIcon call here — icon automatically clears
    this.renderVisual(dataView);
}
```

## Files that may need changes

Depending on the project, likely files include:

- `src/visual.ts` — Add `displayWarningIcon()` calls in the `update()` method

No additional files, config changes, or capabilities updates are required for warning icons. The API is available directly on `IVisualHost`.

## Validation checklist

Before finishing, verify that:

- `IVisualHost` is stored from the constructor options
- `displayWarningIcon()` is called with both `title` and `detailedMessage` strings
- The warning condition is evaluated inside the `update()` method
- The warning icon is not shown when data is valid (automatic clearing)
- The warning messages are clear and actionable for report consumers
- No unrelated files were changed
- Imports and TypeScript structure are valid
- The `powerbi-visuals-api` version is 2.6.0 or higher

## Important notes

- The warning icon appears in the visual header — it does NOT render inside the visual canvas.
- Multiple calls to `displayWarningIcon()` in a single `update()` cycle will show only the last warning. If you need to show multiple warnings, concatenate them into a single message.
- The warning icon is visible to report consumers (not just developers).
- Use warning icons for non-blocking issues only. For blocking errors, consider showing an error message inside the visual instead.
- The tooltip supports plain text only — no HTML or markdown.

## Reference

Official Microsoft documentation: https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-display-warning-icon
