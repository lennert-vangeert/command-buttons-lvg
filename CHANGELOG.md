# Change Log

All notable changes to the "command-buttons" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.0] - 2026-01-10

### Features

- Add comprehensive settings system with support for:
  - `defaultTerminalName`: Custom terminal name
  - `terminalType`: Choose between VS Code integrated terminal or Ghostty terminal emulator
  - `reuseTerminal`: Option to reuse or create new terminals
  - `focusTerminalOnRun`: Control terminal focus behavior
  - `showReloadNotification`: Toggle config reload notifications
  - `showErrorNotifications`: Toggle error notifications
  - `statusBarAlignment`: Position buttons left or right
  - `showButtonTooltips`: Show/hide button tooltips
  - `iconOnlyMode`: Display only icons without text
  - `configFileName`: Customizable config file name
  - `watchConfigFile`: Enable/disable file watching
  - `showCommandRunningIndicator`: Toggle spinner display when commands are executing
- Add messaging utilities for better user feedback
- Implement settings validation and error handling
- Add Ghostty terminal emulator support for external command execution
- Add custom icon to terminals created by the extension

## [1.0.1] - 2026-01-08

### Features

- Add icon to extension package.
- Add tests

### Fixes

- Update README for clarity and more examples.
- Make sure extension also works on non mono repo projects.
- Add stronger typing for configuration.

## [1.0.0] - 2026-01-07

- Initial release
