import * as vscode from "vscode";

export type Settings = {
  defaultTerminalName: string;
  reuseTerminal: boolean;
  focusTerminalOnRun: boolean;
  showReloadNotification: boolean;
  showErrorNotifications: boolean;
  statusBarAlignment: "left" | "right";
  showButtonTooltips: boolean;
  iconOnlyMode: boolean;
  configFileName: string;
  watchConfigFile: boolean;
  showCommandRunningIndicator: boolean;
};

export let settings: Settings;

/**
 * Reads and parses the extension settings from VS Code configuration.
 * Updates the global settings object with current user preferences.
 */
export const readSettings = (): void => {
  const config = vscode.workspace.getConfiguration("commandButtons");
  settings = JSON.parse(JSON.stringify(config));
};
