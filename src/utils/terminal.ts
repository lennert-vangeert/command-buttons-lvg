import * as vscode from "vscode";
import * as path from "path";

export const runCommandInTerminal = (command: string, directory?: string) => {
  console.log("Running command in terminal: " + command);

  // check if a terminal named "VS Code Buttons" already exists
  let terminal = vscode.window.terminals.find(
    (term) => term.name === "VS Code Buttons"
  );

  const isNewTerminal = !terminal;

  if (!terminal) {
    terminal = vscode.window.createTerminal("VS Code Buttons");
  }

  terminal.show();

  // For existing terminals, stop any running process first
  if (!isNewTerminal) {
    // Send Ctrl+C to stop any running process (like a dev server)
    terminal.sendText("\u0003"); // Using unicode for better compatibility
    console.log("Stopping any running process...");
  }

  // Wait for process to stop and terminal to be ready
  const delay = isNewTerminal ? 10 : 250;
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
  }, delay);
};
