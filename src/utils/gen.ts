import * as vscode from "vscode";
import { runCommandInTerminal } from "./terminal";
import { NormalizedConfig, Button } from "./read";
import { settings } from "./settings";

const ACTIVE_TAB_STATE_KEY = "commandButtons.activeTab";

// Items + commands recreated on every render (each tab switch or reload).
let statusBarItems: vscode.StatusBarItem[] = [];
let buttonDisposables: vscode.Disposable[] = [];

// Tab-switch commands are registered once per config load (not per switch,
// since VS Code throws on duplicate command IDs) and disposed on full reload.
let tabCommandDisposables: vscode.Disposable[] = [];

// Running state keyed by command ID so it survives re-renders / tab switches.
let runningCommands: Map<string, boolean> = new Map();

// Current tab state.
let currentConfig: NormalizedConfig | null = null;
let activeTabName: string | null = null;
let extContext: vscode.ExtensionContext | null = null;

/**
 * Clears all status bar items, their command disposables, and tab state.
 * Used on a full reload or when the config is deleted.
 */
export const clearStatusBarButtons = () => {
  statusBarItems.forEach((item) => item.dispose());
  statusBarItems = [];
  buttonDisposables.forEach((d) => d.dispose());
  buttonDisposables = [];
  tabCommandDisposables.forEach((d) => d.dispose());
  tabCommandDisposables = [];
  runningCommands.clear();
  currentConfig = null;
  activeTabName = null;
  extContext = null;
};

/**
 * Disposes only the per-render items (tab labels + visible buttons), leaving
 * tab-switch command registrations intact across tab switches.
 */
const clearRenderedItems = () => {
  statusBarItems.forEach((item) => item.dispose());
  statusBarItems = [];
  buttonDisposables.forEach((d) => d.dispose());
  buttonDisposables = [];
};

/**
 * Checks if the running indicator should be shown.
 * Disabled when using Ghostty since we can't track external terminal state.
 */
const shouldShowRunningIndicator = (): boolean => {
  return (
    settings.showCommandRunningIndicator && settings.terminalType !== "ghostty"
  );
};

/**
 * Sets the button item text, showing a spinner when the command is running.
 */
const applyButtonText = (
  item: vscode.StatusBarItem,
  btn: Button,
  isRunning: boolean
) => {
  const icon =
    isRunning && shouldShowRunningIndicator() ? "loading~spin" : btn.icon;
  item.text = `$(${icon}) ${settings.iconOnlyMode ? "" : btn.text ?? ""}`.trim();
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

const getAlignment = (): vscode.StatusBarAlignment =>
  settings.statusBarAlignment === "right"
    ? vscode.StatusBarAlignment.Right
    : vscode.StatusBarAlignment.Left;

/**
 * Creates a single command button status bar item with the given priority and
 * stable command ID, registering its run handler.
 */
const createButtonItem = (
  btn: Button,
  commandId: string,
  priority: number,
  context: vscode.ExtensionContext
) => {
  const item = vscode.window.createStatusBarItem(getAlignment(), priority);

  item.color = btn.color;
  item.tooltip = settings.showButtonTooltips
    ? truncateText(btn.command, 50)
    : undefined;
  applyButtonText(item, btn, runningCommands.get(commandId) ?? false);

  const disposable = vscode.commands.registerCommand(commandId, async () => {
    if (shouldShowRunningIndicator()) {
      runningCommands.set(commandId, true);
      applyButtonText(item, btn, true);
    }
    try {
      await runCommandInTerminal(btn.command, btn.directory, btn.terminalName);
    } finally {
      if (shouldShowRunningIndicator()) {
        runningCommands.set(commandId, false);
        applyButtonText(item, btn, false);
      }
    }
  });

  item.command = commandId;
  item.show();

  statusBarItems.push(item);
  buttonDisposables.push(disposable);
  context.subscriptions.push(item);
  context.subscriptions.push(disposable);
};

/**
 * Creates a tab label status bar item. Clicking it activates that tab.
 */
const createTabLabel = (
  name: string,
  icon: string | undefined,
  color: string | undefined,
  tabIndex: number,
  priority: number,
  isActive: boolean
) => {
  const item = vscode.window.createStatusBarItem(getAlignment(), priority);

  if (settings.iconOnlyMode && icon) {
    item.text = `$(${icon})`;
  } else {
    item.text = icon ? `$(${icon}) ${name}` : name;
  }

  item.color = color;

  if (isActive && settings.activeTabHighlight !== "none") {
    item.backgroundColor = new vscode.ThemeColor(
      settings.activeTabHighlight === "warning"
        ? "statusBarItem.warningBackground"
        : "statusBarItem.prominentBackground"
    );
  }

  item.tooltip = settings.showButtonTooltips ? `Switch to tab: ${name}` : undefined;
  item.command = `commandButtons.activateTab.${tabIndex}`;
  item.show();

  statusBarItems.push(item);
};

/**
 * Creates a non-interactive divider item to separate the tab labels from the
 * buttons in the status bar.
 */
const createSeparator = (priority: number) => {
  const item = vscode.window.createStatusBarItem(getAlignment(), priority);
  item.text = "|";
  item.color = new vscode.ThemeColor("descriptionForeground");
  item.show();
  statusBarItems.push(item);
};

/**
 * Renders the current tab labels, pinned buttons, and active-tab buttons.
 * Priority bands keep left-to-right order:
 * [tab labels] | [pinned] [active buttons].
 */
const renderItems = (context: vscode.ExtensionContext) => {
  clearRenderedItems();

  if (!currentConfig) {
    return;
  }

  const { tabs, pinned } = currentConfig;

  // Flat config (no tabs): render pinned exactly like before — no labels.
  if (tabs.length === 0) {
    pinned.forEach((btn, i) => {
      createButtonItem(btn, `commandButtons.runCommand.pinned.${i}`, 100 - i, context);
    });
    return;
  }

  // Tab labels (leftmost band).
  tabs.forEach((tab, tabIndex) => {
    createTabLabel(
      tab.name,
      tab.icon,
      tab.color,
      tabIndex,
      1000 - tabIndex,
      tab.name === activeTabName
    );
  });

  // Divider between the tab labels and the buttons.
  createSeparator(700);

  // Pinned buttons (middle band) — shown on every tab.
  pinned.forEach((btn, i) => {
    createButtonItem(btn, `commandButtons.runCommand.pinned.${i}`, 500 - i, context);
  });

  // Active tab's buttons (rightmost band).
  const activeIndex = tabs.findIndex((t) => t.name === activeTabName);
  if (activeIndex !== -1) {
    tabs[activeIndex].buttons.forEach((btn, i) => {
      createButtonItem(
        btn,
        `commandButtons.runCommand.tab.${activeIndex}.${i}`,
        100 - i,
        context
      );
    });
  }
};

/**
 * Determines which tab should be active on load, reconciling persisted state
 * and settings against the tabs that actually exist in the current config.
 */
const resolveActiveTab = (config: NormalizedConfig): string => {
  const exists = (name: string | undefined): name is string =>
    !!name && config.tabs.some((t) => t.name === name);

  if (settings.rememberActiveTab && extContext) {
    const stored = extContext.workspaceState.get<string>(ACTIVE_TAB_STATE_KEY);
    if (exists(stored)) {
      return stored;
    }
  }

  if (exists(settings.defaultActiveTab)) {
    return settings.defaultActiveTab;
  }

  return config.tabs[0].name;
};

/**
 * Registers one tab-switch command per tab. Switching sets the active tab,
 * persists it (per workspace), and re-renders the visible items.
 */
const registerTabCommands = (
  config: NormalizedConfig,
  context: vscode.ExtensionContext
) => {
  config.tabs.forEach((tab, tabIndex) => {
    const disposable = vscode.commands.registerCommand(
      `commandButtons.activateTab.${tabIndex}`,
      () => {
        activeTabName = tab.name;
        if (settings.rememberActiveTab && extContext) {
          extContext.workspaceState.update(ACTIVE_TAB_STATE_KEY, tab.name);
        }
        renderItems(context);
      }
    );
    tabCommandDisposables.push(disposable);
    context.subscriptions.push(disposable);
  });
};

/**
 * Creates status bar items from a normalized config. Renders tab labels,
 * pinned buttons, and the active tab's buttons. With no tabs, behaves exactly
 * like the previous flat-button rendering.
 *
 * @param config - Normalized config (tabs + pinned buttons)
 * @param context - VS Code extension context for managing subscriptions
 */
export const createStatusBarButtons = (
  config: NormalizedConfig,
  context: vscode.ExtensionContext
) => {
  currentConfig = config;
  extContext = context;

  if (config.tabs.length > 0) {
    activeTabName = resolveActiveTab(config);
    registerTabCommands(config, context);
  } else {
    activeTabName = null;
  }

  renderItems(context);
};
