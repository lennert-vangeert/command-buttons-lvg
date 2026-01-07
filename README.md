# Command Buttons

Add configurable buttons to the VS Code status bar that run project commands.

## Usage

Add this to your project `.command-buttons.json` at the root of the workspace:

the file should look something like this:

```json
{
  "buttons": [
    {
      "icon": "rocket", // see https://microsoft.github.io/vscode-codicons/dist/codicon.html for available icons
      "color": "#00ffcc", // any valid CSS color
      "text": "Dev", // text to show next to the icon
      "directory": "web", // directory to run the command in (relative to workspace root)
      "command": "npm run dev" // command to run when button is clicked
    },
    {
      "icon": "check",
      "color": "green",
      "text": "Lint",
      "directory": "web",
      "command": "npm run lint"
    }
  ]
}
```

The config file is continuously monitored for changes, so buttons will be added/removed as you edit the file.
