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
- a sessions sidebar backed by persisted workspaces instead of placeholder entries
- template actions that create Angular, ASP.NET API, Full Stack, Docker Compose, and empty workspaces
- richer workspace records that now persist layout mode, launch profile, and a lightweight session snapshot for future tab and pane restore
- a real terminal tab strip that can create, switch, close, and persist tabs per workspace

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

The sessions sidebar now supports selecting persisted workspaces and creating new workspaces from starter templates.

Workspace persistence now tracks more than name and directory: each workspace stores restore-oriented metadata that will support real tab and pane restoration in the next stories.

The top tab strip is now backed by persisted workspace snapshot state instead of static placeholder tabs.

## Architecture direction

- Angular handles rendering and user interaction.
- Electron main owns PTY and process management.
- xterm.js provides the terminal UI.
- SQLite persistence runs in Electron main and is exposed through the preload bridge.
- The active workspace and workspace list are managed in Electron main and projected into the sidebar through the preload bridge.
- Workspace records now include lightweight restore metadata so the current shell can grow into real tab and split-pane restoration without redesigning persistence later.
- Terminal tab actions now update the workspace snapshot directly, so the renderer is beginning to operate against the same restore model that later pane-layout work will use.
