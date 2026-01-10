import * as vscode from "vscode";
import * as path from "path";
import { settings } from "./settings";

/**
 * Executes a command in the VS Code integrated terminal.
 * Creates or reuses a terminal based on settings, handles directory changes,
 * and stops running processes if reusing an existing terminal.
 *
 * @param command - The command to execute in the terminal
 * @param directory - Optional directory path relative to workspace root to execute the command in
 * @returns Promise that resolves when the command has been sent to the terminal
 */
export const runCommandInTerminal = (
  command: string,
  directory?: string
): Promise<void> => {
  console.log("Running command in terminal: " + command);

  // check if a terminal named "VS Code Buttons" already exists.
  let terminal = vscode.window.terminals.find(
    (term) => term.name === settings.defaultTerminalName
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
      name: settings.defaultTerminalName,
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
