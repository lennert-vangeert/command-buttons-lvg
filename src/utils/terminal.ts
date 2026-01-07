import * as vscode from "vscode";
import * as path from "path";

export const runCommandInTerminal = (command: string, directory?: string) => {
  console.log("Running command in terminal: " + command);

  // check if a terminal named "VS Code Buttons" already exists
  let terminal = vscode.window.terminals.find(
    (term) => term.name === "VS Code Buttons"
  );
  if (!terminal) {
    terminal = vscode.window.createTerminal("VS Code Buttons");
  }

  terminal.show();

  // Send ctrl+c first to stop any running process
  terminal.sendText("\x03");

  // Wait a bit before sending the next commands
  setTimeout(() => {
    if (directory) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const targetPath = path.join(rootPath, directory);
        terminal!.sendText(`cd "${targetPath}"`);
      }
    }
    terminal!.sendText(command);
  }, 100);
};
