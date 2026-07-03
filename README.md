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
- command palette and global workspace search

### Target UI reference

![NthTerm target UI](docs/target-ui-reference.png)

## Current status

Current milestone: **Phase 5 in progress** — production readiness after verified desktop packaging.

Working today:

- Electron opens and renders a real interactive terminal
- PTY lifecycle is managed in Electron main through `node-pty`
- workspace state is stored in SQLite through an Electron-managed persistence layer
- multiple named workspaces and starter templates
- explicit `New Session` creation from the sessions rail
- workspace rename and delete from the sessions sidebar
- each workspace persists tabs, layout mode, focused pane, pane splits, and pane-to-tab assignments
- `2-up` and `2x2` pane layouts with draggable split handles and focused-pane terminal restore
- concurrent PTY-backed terminal sessions across visible panes, with focused-pane inspector/control targeting
- live terminal sessions stay attached to their tab across tab switches instead of being recreated when the pane assignment changes
- tab and session inspector with live PTY metadata and restart/stop/kill actions
- bottom utility panels: output, problems, search, and command history (visible by default, toggle in Appearance)
- resizable workspace dock with persisted height
- system monitor (CPU, memory, disk, network) and session environment variables
- command palette and global workspace search
- last workspace auto-restores on launch, with invalid directory fallback
- per-tab shell preference and startup commands persisted in SQLite
- session history and recovery metadata persisted per workspace, including latest exit reason/code and recent session events
- frameless desktop window with custom title bar drag regions and integrated window controls
- verified production desktop packaging scripts for local unpacked builds and Windows installer/zip artifacts
- Angular renderer split into feature components and services (`models/`, `workspace/`, `terminal/`, `utility-panel/`, `command-palette/`, etc.) per architecture code-style rules

Keyboard shortcuts:

- `Ctrl+Shift+P` — command palette
- `Ctrl+Shift+F` — global workspace search

Next up:

- add GitHub Actions CI/release artifact workflow for build, tests, and unsigned Windows artifacts

## Design alignment checklist

The target for Phase 4 is **1:1 implementation fidelity** with the reference design in `docs/target-ui-reference.png`. The goal is not to build a UI that is merely inspired by the reference or generally aligned with it. We should match the reference as closely as the product architecture allows, and only deviate when a concrete runtime constraint makes an exact match impossible. Any intentional deviation should be documented explicitly.

- [x] Match the desktop chrome and integrated top shell to the reference.
  Implement the same overall titlebar feel, header composition, workspace switcher placement, and top action grouping shown in the target design.
- [x] Match the center workspace composition to the reference.
  Recreate the same pane density, terminal-card hierarchy, card spacing, and live-workspace feel instead of replacing them with alternate summary or hero patterns.
- [x] Match the tab strip and tab metadata treatment to the reference.
  Mirror the tab sizing, stacking, active-state emphasis, icon treatment, and top-level metadata presentation shown in the plan design.
- [x] Match the left sidebar structure and visual rhythm to the reference.
  Reproduce the same grouping, spacing, icon style, row treatment, and section hierarchy for sessions, templates, tools, and settings.
- [x] Match the right inspector structure to the reference.
  Recreate the card layout, metadata grouping, quick actions, recent commands, and environment sections as they appear in the target UI.
- [x] Match the bottom dock composition to the reference.
  Implement the same output, problems, search, command history, and monitor balance instead of substituting a materially different layout.
- [x] Match the system monitor card design to the reference.
  Reproduce the same telemetry emphasis, card balance, ring treatment, and sizing used in the concept.
- [x] Match the visual language across spacing, borders, radii, color, and typography.
  Use the reference as the source of truth for the shell's density and finish rather than inventing adjacent styling.
- [x] Seed realistic content that matches the reference presentation.
  Populate the interface with believable sessions, commands, telemetry, and inspector content so screenshots and reviews compare against the reference fairly.
- [x] Document any unavoidable deviations.
  If a behavior or layout cannot be implemented 1:1 because of Electron, PTY, or runtime constraints, record the exact constraint and the smallest acceptable fallback.

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

Package a local desktop build:

```bash
npm run package
```

Create unsigned Windows installer and zip artifacts:

```bash
npm run release:win
```

Generated desktop artifacts are written under `release/` and are intentionally ignored by git.

GitHub Actions runs the same build and test path on pull requests and pushes to `main`. The Windows release job uploads unsigned installer and zip artifacts from the workflow run.

## Notes

The persistence layer stores restore-oriented workspace metadata, including:

- workspace identity and working directory
- template and visual metadata
- launch profile and layout mode
- tab snapshot data (cwd, shell, startup commands, status)
- focused pane and pane assignments
- recovery metadata and recent session history

The split-pane shell now restores one live interactive terminal per assigned visible pane. Focus determines which pane drives inspector metadata, environment details, and restart/stop/kill actions.

Terminal input is sanitized before forwarding to the PTY so focus-reporting and bracketed-paste escape sequences do not interfere with typed commands or command history.

On launch, the app restores the last active workspace from SQLite. Invalid saved directories fall back to the user home directory so PTY creation does not fail on missing paths.

## Architecture direction

- Angular handles rendering and user interaction through a thin `AppComponent` shell and feature components.
- Business logic lives in injectable Angular services; shared UI models live under `src/app/models/`.
- Shell styles are centralized in `src/app/styles/shell.css` and imported from `src/styles.css`.
- Electron main owns PTY and process management.
- xterm.js provides the terminal UI.
- SQLite persistence runs in Electron main and is exposed through the preload bridge.
- The active workspace and workspace list are managed in Electron main and projected into the sidebar through the preload bridge.
- System metrics and session environment variables are served through a dedicated preload bridge.
- Workspace records include restore metadata so the shell can grow into deeper tab and split-pane restoration without redesigning persistence later.
- Terminal tab actions update the workspace snapshot directly.
- Terminal session ownership now follows tabs, allowing live sessions to be parked and reattached as pane assignments change without tearing down the underlying PTY.
