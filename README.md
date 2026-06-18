# NthTerm

NthTerm is a cross-platform terminal workspace manager built with Angular, Electron, xterm.js, node-pty, and SQLite.

The goal is to make it easy to create, save, restore, and manage rich terminal workspaces with multiple tabs, pane layouts, startup context, and session-aware tooling.

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

Current milestone: Phase 2 desktop shell and workspace persistence.

Working today:

- Electron opens and renders a real interactive terminal
- PTY lifecycle is managed in Electron main through `node-pty`
- workspace state is stored in SQLite through an Electron-managed persistence layer
- the app supports multiple named workspaces and starter templates
- each workspace can persist tabs, layout mode, focused pane, and pane-to-tab assignments
- the shell currently supports `2-up` and `2x2` pane layouts
- the focused pane restores the live xterm session while the other panes show saved assignment context

In progress:

- richer inspector actions and session metadata
- utility panels for output, problems, search, and command history
- deeper multi-pane runtime behavior beyond the current focused-pane model

## Quick start

Install dependencies:

```bash
npm install
```

Run Angular and Electron together for local development:

```bash
npm start
```

Build the Angular app:

```bash
npm run build
```

Launch Electron against the production build:

```bash
npm run desktop
```

## Notes

The current persistence slice stores restore-oriented workspace metadata, including:

- workspace identity and working directory
- template and visual metadata
- launch profile and layout mode
- tab snapshot data
- focused pane and pane assignments

The split-pane shell currently restores one live interactive terminal into the focused pane while the other assigned panes show saved tab context. This keeps PTY ownership simple in Electron main for now and gives the project a clean path toward true concurrent pane sessions later.

## Architecture direction

- Angular handles rendering and user interaction.
- Electron main owns PTY and process management.
- xterm.js provides the terminal UI.
- SQLite persistence runs in Electron main and is exposed through the preload bridge.
- The active workspace and workspace list are managed in Electron main and projected into the sidebar through the preload bridge.
- Workspace records include restore metadata so the shell can grow into deeper tab and split-pane restoration without redesigning persistence later.
- Terminal tab actions update the workspace snapshot directly.
- Pane layout restoration currently uses a focused-pane model: Angular renders the workspace grid and saved pane assignments, while Electron still owns the single active PTY session lifecycle.
