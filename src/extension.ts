// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { readConfig } from "./utils/read";
import { createStatusBarButtons, clearStatusBarButtons } from "./utils/gen";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // show message when the extension is activated for the first time

  const loadButtons = () => {
    const buttons = readConfig();
    if (buttons) {
      clearStatusBarButtons();
      createStatusBarButtons(buttons, context);
    }
  };

  // Initial load
  loadButtons();

  // Watch for config file changes
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/.command-buttons.json"
  );

  watcher.onDidChange(() => {
    vscode.window.showInformationMessage("Command buttons config reloaded!");
    loadButtons();
  });

  watcher.onDidCreate(() => {
    vscode.window
      .showInformationMessage("Command buttons config created!", "More info")
      .then((selection) => {
        if (selection === "More info") {
          vscode.env.openExternal(vscode.Uri.parse("https://www.google.com"));
        }
      });
    loadButtons();
  });

  watcher.onDidDelete(() => {
    vscode.window.showInformationMessage("Command buttons config deleted!");
    clearStatusBarButtons();
  });
  context.subscriptions.push(watcher);
}

// This method is called when your extension is deactivated
export function deactivate() {}
