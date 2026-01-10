// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { readConfig } from "./utils/read";
import { createStatusBarButtons, clearStatusBarButtons } from "./utils/gen";
import { readSettings, settings } from "./utils/settings";
import { showReloadMessage } from "./utils/messaging";

/**
 * Activates the Command Buttons extension.
 * Sets up configuration watchers, loads initial buttons, and manages lifecycle.
 *
 * @param context - VS Code extension context for managing subscriptions and resources
 */
export function activate(context: vscode.ExtensionContext) {
  readSettings();
  let configFileWatcher: vscode.FileSystemWatcher | undefined;

  const loadButtons = () => {
    const buttons = readConfig();
    if (buttons) {
      clearStatusBarButtons();
      createStatusBarButtons(buttons, context);
    }
  };

  const setupConfigWatcher = () => {
    // Dispose old watcher if it exists
    if (configFileWatcher) {
      configFileWatcher.dispose();
      configFileWatcher = undefined;
    }

    // Only create watcher if watchConfigFile is enabled
    if (!settings.watchConfigFile) {
      return;
    }

    // Watch for config file changes
    configFileWatcher = vscode.workspace.createFileSystemWatcher(
      `**/${settings.configFileName}`
    );

    configFileWatcher.onDidChange(() => {
      showReloadMessage("Command buttons config changed!");
      loadButtons();
    });

    configFileWatcher.onDidCreate(() => {
      showReloadMessage("Command buttons config created!", "initial");
      loadButtons();
    });

    configFileWatcher.onDidDelete(() => {
      showReloadMessage("Command buttons config deleted!");
      clearStatusBarButtons();
    });

    context.subscriptions.push(configFileWatcher);
  };

  const settingsWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("commandButtons")) {
      readSettings();

      // Recreate the config file watcher with new settings
      setupConfigWatcher();

      // Reload buttons with fresh config
      loadButtons();
    }
  });
  context.subscriptions.push(settingsWatcher);

  // Initial load
  loadButtons();

  // Setup initial config file watcher
  setupConfigWatcher();
}

/**
 * Deactivates the Command Buttons extension.
 * Performs cleanup when the extension is deactivated.
 */
export function deactivate() {}
