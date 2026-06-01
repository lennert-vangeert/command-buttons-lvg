import * as vscode from "vscode";
import { Button } from "./read";
import { runCommandInTerminal } from "./terminal";

/**
 * True when the button runs a shell command (vs. opening a URL or invoking a
 * VS Code command). Used to decide whether the running spinner makes sense.
 */
export const isShellButton = (b: Button): boolean =>
  !!b.command && !b.url && !b.vscodeCommand;

/**
 * Shows a confirmation modal when the button has `confirm` set.
 *
 * @returns True if the action should proceed, false if the user cancelled.
 */
const confirmIfNeeded = async (btn: Button): Promise<boolean> => {
  if (!btn.confirm) {
    return true;
  }
  const message =
    typeof btn.confirm === "string"
      ? btn.confirm
      : `Run "${btn.text ?? btn.command ?? btn.vscodeCommand ?? btn.url}"?`;
  const choice = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    "Run"
  );
  return choice === "Run";
};

/**
 * Executes a button's action, dispatching on which action field is set:
 * `url` opens externally, `vscodeCommand` runs a VS Code command, and
 * `command` runs a shell command in the configured terminal. Honors `confirm`.
 *
 * @param btn - The button to execute
 */
export const executeButton = async (btn: Button): Promise<void> => {
  if (!(await confirmIfNeeded(btn))) {
    return;
  }

  if (btn.url) {
    await vscode.env.openExternal(vscode.Uri.parse(btn.url));
  } else if (btn.vscodeCommand) {
    await vscode.commands.executeCommand(btn.vscodeCommand, ...(btn.args ?? []));
  } else if (btn.command) {
    await runCommandInTerminal(btn.command, btn.directory, btn.terminalName);
  }
};
