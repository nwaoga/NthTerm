# NthTerm

NthTerm is a cross-platform terminal workspace manager built with Angular, Electron, xterm.js, node-pty, and SQLite.

## Product direction

NthTerm is headed toward a rich desktop workspace experience for developers and operators:

- named workspaces and starter templates
- multiple tabs and split panes
- session-aware terminal cards with status and quick actions
- right-side inspectors for tab and session metadata
- bottom utility panels for output, problems, search, and command history
- workspace telemetry such as system monitor and environment details

### Target UI reference

![NthTerm target UI](docs/target-ui-reference.png)

## Current status

Phase 1 is complete with a working Electron shell that renders a real interactive terminal.

Phase 2 is now underway with a first persistence slice:

- a SQLite-backed default workspace record stored from Electron main
- preload APIs for loading and saving workspace state
- Angular controls for workspace name, working directory, save, restore, and terminal relaunch

## Development

Install dependencies:

```bash
npm install
```

Run the Angular renderer and Electron shell together:

```bash
npm start
```

Build the Angular app:

```bash
npm run build
```

Launch Electron against the built app:

```bash
npm run desktop
```

The current persistence slice stores one default workspace and relaunches the terminal using the saved working directory.

## Architecture direction

- Angular handles rendering and user interaction.
- Electron main owns PTY and process management.
- xterm.js provides the terminal UI.
- SQLite persistence runs in Electron main and is exposed through the preload bridge.
