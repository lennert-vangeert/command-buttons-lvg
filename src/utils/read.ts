import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export const readConfig = () => {
  console.log("Reading config");
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(rootPath, ".command-buttons.json");

  if (!fs.existsSync(configPath)) {
    console.log(".command-buttons.json not found at " + configPath);
    return;
  }

  const json = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const buttons = json.buttons;

  if (!Array.isArray(buttons)) {
    return;
  }

  return buttons;
};
