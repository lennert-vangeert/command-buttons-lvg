import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";
import { settings } from "./settings";

/**
 * Executes a command in Ghostty terminal emulator.
 * Opens a new Ghostty window with the specified command.
 * Note: Due to macOS limitations, each command opens a new window.
 *
 * @param command - The command to execute
 * @param directory - Optional directory path relative to workspace root
 * @returns Promise that resolves when Ghostty is launched
 */
const runInGhostty = (command: string, directory?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = directory && workspaceFolders
      ? path.join(workspaceFolders[0].uri.fsPath, directory)
      : workspaceFolders?.[0].uri.fsPath;

    // Use 'open -na' to open new Ghostty instance with command
    // Note: -n flag required to pass arguments, but creates new window each time (macOS limitation)
    const ghosttyCmd = `open -na Ghostty --args --working-directory="${cwd}" -e zsh -c "${command}; exec zsh"`;

    exec(ghosttyCmd, (error) => {
      if (error) {
        console.error("Failed to launch Ghostty:", error);
        vscode.window.showErrorMessage(
          "Failed to launch Ghostty. Make sure it's installed in /Applications."
        );
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Executes a command in the VS Code integrated terminal.
 * Creates or reuses a terminal based on settings, handles directory changes,
 * and stops running processes if reusing an existing terminal.
 *
 * @param command - The command to execute in the terminal
 * @param directory - Optional directory path relative to workspace root to execute the command in
 * @param terminalName - Optional terminal name for grouping commands (falls back to defaultTerminalName)
 * @returns Promise that resolves when the command has been sent to the terminal
 */
const runInVSCodeTerminal = (
  command: string,
  directory?: string,
  terminalName?: string
): Promise<void> => {
  console.log("Running command in terminal: " + command);

  // Use provided terminalName or fall back to settings.defaultTerminalName
  const targetTerminalName = terminalName || settings.defaultTerminalName;

  // Check if a terminal with this name already exists
  let terminal = vscode.window.terminals.find(
    (term) => term.name === targetTerminalName
  );

  let isNewTerminal = !terminal;

  if (!terminal || !settings.reuseTerminal) {
    const iconPath = vscode.Uri.joinPath(
      vscode.extensions.getExtension("lennert-vangeert.command-buttons-lvg")!
        .extensionUri,
      ".github",
      "images",
      "icon.png"
    );

    terminal = vscode.window.createTerminal({
      name: targetTerminalName,
      iconPath: iconPath,
    });
    isNewTerminal = true; // Mark as new terminal since we just created it
  }

  terminal.show(!settings.focusTerminalOnRun);

  // For existing terminals, stop any running process first
  if (!isNewTerminal) {
    // Send Ctrl+C to stop any running process (like a dev server)
    terminal.sendText("\u0003"); // Using unicode for better compatibility
    console.log("Stopping any running process...");
  }

  // Wait for process to stop and terminal to be ready
  const delay = isNewTerminal ? 10 : 250;
  return new Promise((resolve) => {
    setTimeout(() => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (directory) {
        console.log("Changing directory to: " + directory);
        if (workspaceFolders) {
          const rootPath = workspaceFolders[0].uri.fsPath;
          const targetPath = path.join(rootPath, directory);
          if (rootPath !== targetPath) {
            terminal!.sendText(`cd "${targetPath}"`);
          }
        }
      }
      if (workspaceFolders && !directory) {
        // If no directory is specified, ensure we're in the workspace root
        const rootPath = workspaceFolders[0].uri.fsPath;
        terminal!.sendText(`cd "${rootPath}"`);
      }
      console.log("Sending command: " + command);
      terminal!.sendText(command);
      resolve();
    }, delay);
  });
};

/**
 * Executes a command in the configured terminal (VS Code or Ghostty).
 * Routes to the appropriate terminal implementation based on settings.
 *
 * @param command - The command to execute
 * @param directory - Optional directory path relative to workspace root
 * @param terminalName - Optional terminal name for grouping commands (VS Code only)
 * @returns Promise that resolves when the command has been executed
 */
export const runCommandInTerminal = (
  command: string,
  directory?: string,
  terminalName?: string
): Promise<void> => {
  if (settings.terminalType === "ghostty") {
    return runInGhostty(command, directory);
  } else {
    return runInVSCodeTerminal(command, directory, terminalName);
  }
};
