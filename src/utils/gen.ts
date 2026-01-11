import * as vscode from "vscode";
import { runCommandInTerminal } from "./terminal";
import { Buttons, Button } from "./read";
import { settings } from "./settings";

let statusBarItems: vscode.StatusBarItem[] = [];
let commandDisposables: vscode.Disposable[] = [];
let runningCommands: Map<number, boolean> = new Map();

/**
 * Clears all status bar buttons and their command disposables.
 * Removes all buttons from the status bar and cleans up resources.
 */
export const clearStatusBarButtons = () => {
  statusBarItems.forEach((item) => item.dispose());
  statusBarItems = [];
  commandDisposables.forEach((disposable) => disposable.dispose());
  commandDisposables = [];
  runningCommands.clear();
};

/**
 * Checks if the running indicator should be shown.
 * Disabled when using Ghostty since we can't track external terminal state.
 */
const shouldShowRunningIndicator = (): boolean => {
  return settings.showCommandRunningIndicator && settings.terminalType !== "ghostty";
};

/**
 * Updates the button text to show spinner when command is running.
 */
const updateButtonText = (index: number, btn: Button, isRunning: boolean) => {
  const item = statusBarItems[index];
  if (!item) { return; }

  const icon =
    isRunning && shouldShowRunningIndicator()
      ? "loading~spin"
      : btn.icon;
  item.text = `$(${icon}) ${settings.iconOnlyMode ? "" : btn.text ?? ""
    }`.trim();
};

const truncateText = (
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};

/**
 * Creates status bar buttons based on the provided button configuration.
 * Applies user settings for alignment, tooltips, and icon-only mode.
 *
 * @param buttons - Array of button configurations to create
 * @param context - VS Code extension context for managing subscriptions
 */
export const createStatusBarButtons = (
  buttons: Buttons,
  context: vscode.ExtensionContext
) => {
  buttons.forEach((btn, index) => {
    console.log(`Generating button: ${btn.text ?? btn.icon}`);

    const alignment =
      settings.statusBarAlignment === "right"
        ? vscode.StatusBarAlignment.Right
        : vscode.StatusBarAlignment.Left;

    const item = vscode.window.createStatusBarItem(alignment, 100 - index);

    item.text = `$(${btn.icon}) ${settings.iconOnlyMode ? "" : btn.text ?? ""
      }`.trim();
    item.color = btn.color;
    item.tooltip = settings.showButtonTooltips
      ? truncateText(btn.command, 50)
      : undefined;

    const commandId = `commandButtons.runCommand.${index}`;

    const commandDisposable = vscode.commands.registerCommand(
      commandId,
      async () => {
        if (shouldShowRunningIndicator()) {
          runningCommands.set(index, true);
          updateButtonText(index, btn, true);
        }

        try {
          await runCommandInTerminal(btn.command, btn.directory, btn.terminalName);
        } finally {
          if (shouldShowRunningIndicator()) {
            runningCommands.set(index, false);
            updateButtonText(index, btn, false);
          }
        }
      }
    );

    item.command = commandId;
    item.show();

    statusBarItems.push(item);
    commandDisposables.push(commandDisposable);
    context.subscriptions.push(item);
    context.subscriptions.push(commandDisposable);
  });
};
