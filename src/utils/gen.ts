import * as vscode from "vscode";
import { runCommandInTerminal } from "./terminal";

let statusBarItems: vscode.StatusBarItem[] = [];
let commandDisposables: vscode.Disposable[] = [];

export const clearStatusBarButtons = () => {
  statusBarItems.forEach((item) => item.dispose());
  statusBarItems = [];
  commandDisposables.forEach((disposable) => disposable.dispose());
  commandDisposables = [];
};

export const createStatusBarButtons = (
  buttons: any[],
  context: vscode.ExtensionContext
) => {
  console.log(JSON.stringify(buttons));
  buttons.forEach((btn, index) => {
    console.log("Generating button: " + btn.text);
    const item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100 - index
    );

    item.text = `$(${btn.icon}) ${btn.text}`;
    item.color = btn.color;
    item.tooltip = btn.command;

    const commandId = `commandButtons.runCommand.${index}`;

    const commandDisposable = vscode.commands.registerCommand(commandId, () => {
      runCommandInTerminal(btn.command, btn.directory);
    });

    item.command = commandId;
    item.show();

    statusBarItems.push(item);
    commandDisposables.push(commandDisposable);
    context.subscriptions.push(item);
    context.subscriptions.push(commandDisposable);
  });
};
