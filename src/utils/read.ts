import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { showErrorMessage } from "./messaging";
import { settings } from "./settings";

/**
 * Checks if a filename ends with .json extension (case-insensitive).
 *
 * @param filename - The filename to check
 * @returns True if the filename ends with .json, false otherwise
 */
const endsWithJson = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".json");
};

// NOTE: keep this schema in sync with schemas/command-buttons.schema.json
// (hand-maintained JSON Schema that powers in-editor IntelliSense).
const ButtonSchema = z
  .object({
    icon: z.string().nonempty("Icon is required"),
    color: z.string().min(1, "Color must not be empty"),
    text: z.string().optional(),
    directory: z.string().optional(),
    terminalName: z.string().optional(),
    tab: z.string().min(1, "Tab name must not be empty").optional(),
    // Action fields — exactly one is required (see refine below).
    command: z.string().min(1, "Command must not be empty").optional(),
    url: z.string().min(1, "URL must not be empty").optional(),
    vscodeCommand: z
      .string()
      .min(1, "VS Code command must not be empty")
      .optional(),
    args: z.array(z.unknown()).optional(),
    confirm: z.union([z.boolean(), z.string()]).optional(),
  })
  .superRefine((b, ctx) => {
    const actions = [b.command, b.url, b.vscodeCommand].filter(Boolean);
    if (actions.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Exactly one of 'command', 'url', or 'vscodeCommand' is required",
        path: ["command"],
      });
    }
  });

const TabSchema = z.object({
  name: z.string().min(1, "Tab name must not be empty"),
  icon: z.string().optional(),
  color: z.string().optional(),
  buttons: z
    .array(ButtonSchema)
    .min(1, "A tab must define at least one button"),
});

const ConfigSchema = z
  .object({
    tabs: z.array(TabSchema).optional(),
    buttons: z.array(ButtonSchema).optional(),
  })
  .refine(
    (cfg) => (cfg.tabs?.length ?? 0) > 0 || (cfg.buttons?.length ?? 0) > 0,
    {
      message:
        "At least one button must be defined (in 'buttons' or inside a 'tab')",
    }
  );

export type Button = z.infer<typeof ButtonSchema>;
export type Buttons = Button[];

export type NormalizedTab = {
  name: string;
  icon?: string;
  color?: string;
  buttons: Button[];
};

export type NormalizedConfig = {
  tabs: NormalizedTab[];
  pinned: Button[];
};

/**
 * Normalizes a validated config (which may use nested `tabs`, flat per-button
 * `tab` fields, or both) into a single internal model: an ordered list of tabs
 * plus a list of pinned (untagged) buttons shown on every tab.
 *
 * Ordering & metadata rules:
 * - Nested `tabs` are processed first, so they drive tab order and provide
 *   per-tab icon/color. Duplicate tab names merge (last-write-wins on metadata).
 * - Top-level buttons with a `tab` field join that named tab (created/merged),
 *   appended after any nested buttons. Top-level buttons without `tab` are pinned.
 * - A purely flat config (no tabs anywhere) yields `tabs: []` and all buttons pinned.
 */
const normalizeConfig = (
  data: z.infer<typeof ConfigSchema>
): NormalizedConfig => {
  const tabOrder: string[] = [];
  const tabMap = new Map<string, NormalizedTab>();
  const pinned: Button[] = [];

  const ensureTab = (
    name: string,
    icon?: string,
    color?: string
  ): NormalizedTab => {
    let tab = tabMap.get(name);
    if (!tab) {
      tab = { name, icon, color, buttons: [] };
      tabMap.set(name, tab);
      tabOrder.push(name);
    } else {
      if (icon !== undefined) {
        tab.icon = icon;
      }
      if (color !== undefined) {
        tab.color = color;
      }
    }
    return tab;
  };

  // 1) Nested tabs first → drives order, metadata, and default active tab.
  for (const t of data.tabs ?? []) {
    const tab = ensureTab(t.name, t.icon, t.color);
    tab.buttons.push(...t.buttons);
  }

  // 2) Top-level buttons: `tab` → that named tab, otherwise pinned.
  for (const b of data.buttons ?? []) {
    if (b.tab) {
      ensureTab(b.tab).buttons.push(b);
    } else {
      pinned.push(b);
    }
  }

  return { tabs: tabOrder.map((n) => tabMap.get(n)!), pinned };
};

/**
 * Reads and validates the button configuration file from the workspace.
 * Validates the JSON structure using Zod schema and shows error messages.
 *
 * @returns Normalized config (tabs + pinned buttons), or undefined if config is invalid or not found
 */
export const readConfig = (): NormalizedConfig | undefined => {
  if (settings.configFileName.trim() === "") {
    showErrorMessage("Config file name is empty in settings.", false);
    return undefined;
  }
  if (!endsWithJson(settings.configFileName)) {
    showErrorMessage("Config file name must end with .json", false);
    return undefined;
  }

  console.log("Reading config");
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return undefined;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(rootPath, settings.configFileName);

  if (!fs.existsSync(configPath)) {
    console.log(".command-buttons.json not found at " + configPath);
    return undefined;
  }

  let json: unknown;
  try {
    const fileContent = fs.readFileSync(configPath, "utf8");
    json = JSON.parse(fileContent);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    showErrorMessage(`Error parsing .command-buttons.json: ${errorMessage}`);
    return undefined;
  }

  // Validate with Zod
  const result = ConfigSchema.safeParse(json);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => {
        const p = issue.path;

        // Top-level buttons[]
        if (p[0] === "buttons" && typeof p[1] === "number") {
          const field = p[2] || "object";
          return `Button #${p[1] + 1}, field "${String(field)}": ${
            issue.message
          }`;
        }

        // Nested tabs[] and tabs[].buttons[]
        if (p[0] === "tabs" && typeof p[1] === "number") {
          const tabNum = p[1] + 1;
          if (p[2] === "buttons" && typeof p[3] === "number") {
            const field = p[4] || "object";
            return `Tab #${tabNum}, Button #${p[3] + 1}, field "${String(
              field
            )}": ${issue.message}`;
          }
          const field = p[2] || "object";
          return `Tab #${tabNum}, field "${String(field)}": ${issue.message}`;
        }

        const pathStr = p.join(".");
        return pathStr ? `${pathStr}: ${issue.message}` : issue.message;
      })
      .join("\n• ");

    showErrorMessage(`Config validation failed:\n• ${errors}`);
    return undefined;
  }

  return normalizeConfig(result.data);
};
