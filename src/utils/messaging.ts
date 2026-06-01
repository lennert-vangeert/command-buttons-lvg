import * as vscode from "vscode";
import { settings } from "./settings";

/**
 * Displays an error message to the user with an optional button to view extension details.
 * Respects the showErrorNotifications setting.
 *
 * @param message - The error message to display
 * @param withButton - Whether to show a "How to fix" button (default: true)
 */
export const showErrorMessage = (
  message: string,
  withButton: boolean = true
): void => {
  if (!settings.showErrorNotifications) {
    return;
  };
  if (!withButton) {
    vscode.window.showErrorMessage(message);
    return;
  }

  vscode.window
    .showErrorMessage(message, "How to fix")
    .then((selection: string | undefined) => {
      if (selection === "How to fix") {
        vscode.commands
          .executeCommand(
            "extension.open",
            "lennert-vangeert.command-buttons-lvg"
          )
          .then(undefined, (err) => {
            console.error("Failed to open extension:", err);
          });
      }
    });
};

/**
 * Displays a reload/configuration change message to the user.
 * Respects the showReloadNotification setting.
 *
 * @param message - The message to display
 * @param type - Type of message: "default" for simple info, "initial" for message with "More info" button
 */
export const showReloadMessage = (
  message: string,
  type: "default" | "initial" = "default"
): void => {
  if (!settings.showReloadNotification) {return;}

  if (type === "default") {
    vscode.window.showInformationMessage(message);
  } else if (type === "initial") {
    vscode.window
      .showInformationMessage(message, "More info")
      .then((selection: string | undefined) => {
        if (selection === "More info") {
          vscode.commands
            .executeCommand(
              "extension.open",
              "lennert-vangeert.command-buttons-lvg"
            )
            .then(undefined, (err) => {
              console.error("Failed to open extension:", err);
            });
        }
      });
  }
};

/**
 * Displays a debug message during development.
 * Will be used in the future but is not yet integrated.
 *
 * @param message - The debug message to display
 */
export const showDebugMessage = (message: string): void => {
  vscode.window.showInformationMessage(message);
};
