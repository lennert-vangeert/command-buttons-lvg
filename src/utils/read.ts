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

const ButtonSchema = z.object({
  icon: z.string().nonempty("Icon is required"),
  color: z.string().min(1, "Color must not be empty"),
  text: z.string().optional(),
  directory: z.string().optional(),
  command: z.string().min(1, "Command must not be empty"),
});

const ConfigSchema = z.object({
  buttons: z.array(ButtonSchema).min(1, "At least one button must be defined"),
});

export type Button = z.infer<typeof ButtonSchema>;
export type Buttons = Button[];

/**
 * Reads and validates the button configuration file from the workspace.
 * Validates the JSON structure using Zod schema and shows error messages.
 *
 * @returns Array of validated button configurations, or undefined if config is invalid or not found
 */
export const readConfig = (): Buttons | undefined => {
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
        const pathParts = issue.path;

        // Format button index as human-readable number
        if (pathParts[0] === "buttons" && typeof pathParts[1] === "number") {
          const buttonNum = pathParts[1] + 1;
          const field = pathParts[2] || "object";
          return `Button #${buttonNum}, field "${String(field)}": ${
            issue.message
          }`;
        }

        const pathStr = issue.path.join(".");
        return `${pathStr}: ${issue.message}`;
      })
      .join("\n• ");

    showErrorMessage(`Config validation failed:\n• ${errors}`);
    return undefined;
  }

  return result.data.buttons;
};
