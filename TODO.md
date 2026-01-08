- terminalName - Custom terminal name per button (instead of shared "VS Code Buttons")
- Button states (show spinner when command is running)

- settings that may be added:

## Terminal Settings

- `commandButtons.defaultTerminalName` - Default name for terminals (default: "VS Code Buttons")
- `commandButtons.reuseTerminal` - Reuse existing terminal vs create new ones
- `commandButtons.clearTerminalBeforeRun` - Clear terminal before running command
- `commandButtons.focusTerminalOnRun` - Auto-focus terminal when command runs
- `commandButtons.terminalDelayMs` - Delay before sending commands (default: 250ms)

## Notification Settings

- `commandButtons.showReloadNotification` - Show notification when config reloads (default: true)
- `commandButtons.showErrorNotifications` - Show validation error notifications
- `commandButtons.notificationLevel` - "all", "errors", "none"

## UI/Display Settings

- `commandButtons.statusBarAlignment` - Default alignment: "left" or "right"
- `commandButtons.statusBarPriority` - Default priority number for ordering
- `commandButtons.showButtonTooltips` - Enable/disable tooltips
- `commandButtons.iconOnly` - Force all buttons to show icon-only (hide text)

## Config File Settings

- `commandButtons.configFileName` - Custom config filename (default: ".command-buttons.json")
- `commandButtons.autoCreateConfig` - Auto-create config file with template
- `commandButtons.validateOnSave` - Validate config when saving
- `commandButtons.schemaValidation` - Enable JSON schema validation in editor

## Performance Settings

- `commandButtons.watchConfigFile` - Enable/disable file watcher (default: true)
- `commandButtons.debounceMs` - Debounce delay for config changes
