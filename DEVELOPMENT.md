# Development Guide

How to develop, build, and release the **Command Buttons** extension.

## Prerequisites

- [Node.js](https://nodejs.org/) + npm
- VS Code `^1.107.0`
- Install dependencies:

  ```bash
  npm install
  ```

The only runtime dependency is [`zod`](https://zod.dev/) (bundled into the output by esbuild). The extension is published under the `lennert-vangeert` publisher.

## Project layout

```
src/
  extension.ts        # Entry point — activate() / deactivate(), config + settings watchers
  utils/
    read.ts           # Zod config schema, validation, normalize into { tabs, pinned }
    gen.ts            # Status bar rendering: tab labels, pinned + active-tab buttons
    run.ts            # Button execution (shell / url / vscodeCommand) + confirm prompts
    terminal.ts       # VS Code integrated terminal & Ghostty command execution
    settings.ts       # Reads commandButtons.* settings
    messaging.ts      # User notifications
schemas/
  command-buttons.schema.json   # JSON Schema for config IntelliSense (ships in the .vsix)
dist/
  extension.js        # Bundled output (generated, gitignored)
```

> **Keep in sync:** `schemas/command-buttons.schema.json` is hand-maintained alongside the Zod schema in `src/utils/read.ts`. When you add or change a config field, update both.

## Start developing

1. Open this folder in VS Code and press **F5** (the **Run Extension** launch config). This opens a second window — the **Extension Development Host** — with the extension loaded. Its `preLaunchTask` runs the `watch` build, so esbuild and `tsc` rebuild on every save.
2. In that host window, **open a folder** and add a `.command-buttons.json` at its root to see buttons appear in the status bar.
3. After editing source, **reload the host window** (`Cmd/Ctrl+R`) to pick up your changes.

Prefer to build without debugging? Run the watcher manually:

```bash
npm run watch        # runs watch:esbuild + watch:tsc in parallel
```

> A local `.command-buttons.json` is gitignored, so your test config won't be committed.

## Quality checks

```bash
npm run check-types  # tsc --noEmit
npm run lint         # eslint src
npm run compile      # check-types + lint + a dev (unminified, sourcemapped) build
```

## Build for release

```bash
npm run package      # check-types + lint + esbuild --production (minified, no sourcemaps)
```

`package` is also wired to `vscode:prepublish`, so it runs automatically when packaging or publishing.

Create an installable `.vsix` (vsce is not a dependency — invoke it with `npx`):

```bash
npx @vscode/vsce package        # → command-buttons-lvg-<version>.vsix
```

What gets bundled is controlled by `.vscodeignore` (`src/`, `out/`, and `*.map` are excluded; `schemas/` is included). `.vsix` files are gitignored.

Smoke-test the packaged build by installing it locally:

```bash
code --install-extension command-buttons-lvg-<version>.vsix
```

## Release / publish

1. Bump `version` in `package.json` (semver).
2. In `CHANGELOG.md`, move the `## [Unreleased]` entries under a new `## [x.y.z] - YYYY-MM-DD` heading.
3. Commit, tag, and push:

   ```bash
   git commit -am "Release vX.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

   Merge into `main` (see gotcha below).
4. **Publish to the VS Code Marketplace.** This needs a Personal Access Token for the publisher. Authenticate once, then publish:

   ```bash
   npx @vscode/vsce login lennert-vangeert   # or set the VSCE_PAT env var
   npx @vscode/vsce publish
   ```

   `vsce publish patch|minor|major` can do the version bump + git tag for you instead of step 1.
5. *(Optional)* Publish to [Open VSX](https://open-vsx.org/):

   ```bash
   npx ovsx publish -p <token>
   ```
6. *(Optional)* Attach the `.vsix` to a GitHub release.

## Gotchas

- The `$schema` URL referenced in `README.md` points at the `main` branch, so config IntelliSense via that URL only resolves **after** `schemas/command-buttons.schema.json` is pushed to `main`. (For the default `.command-buttons.json` filename, IntelliSense works automatically via the bundled `jsonValidation` contribution — no `$schema` needed.)
- `TODO.md` currently ends up inside the packaged `.vsix`. Add it to `.vscodeignore` if you'd rather it not ship.
