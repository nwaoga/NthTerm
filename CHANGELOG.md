## Unreleased

- Replaced the multi-pane grid and peer-rail focus zoom with a stacked terminal layout: focus mode (one interactive terminal) and overview mode (preview cards for all terminals).
- Raised the per-workspace terminal limit from 4 to 10.
- Added workspace layout state (`viewMode` / `zoomLevel`) separate from PTY process state; inactive terminals stay parked without unnecessary PTY resizes.
- Added keyboard navigation: `Ctrl/Cmd+[` / `]` cycle terminals, `Ctrl/Cmd+1–9` / `0` jump, `Ctrl/Cmd+\` toggle overview.
- Toolbar “Split Terminal” is now “Add Terminal” (adds another terminal to the stack).

## 0.1.0-rc.1 - 2026-07-17

First unsigned Windows release candidate.

- Added persistent inspector hide/show controls and command-palette actions.
- Added per-workspace shell profiles that take precedence over the app default for new terminals.
- Added Windows WSL distribution discovery and WSL terminal/profile choices.
- Added compact-window toolbar behavior, viewport-aware dock sizing, and an auto-collapsing inspector overlay.
- Improved keyboard and assistive-technology support for workspace tabs and layout controls.
- Clarified the workspace, tab, and terminal hierarchy with breadcrumbs, contextual terminal actions, and shell-based terminal names.
- Made new tabs immediately usable by starting their default terminal automatically, while only showing split-layout controls when relevant.
- Added tab rename, drag reorder, duplication, close/reopen, running indicators, and tab/terminal context menus.
- Added workspace, tab, and terminal inspector modes so settings and metadata follow the selected ownership level.
- Added per-workspace dock visibility/height, dock collapse/restore controls, and keyboard workflows for tabs, terminals, splits, and the dock.
- Limited destructive close prompts to tabs, terminals, and workspaces that currently own a running process.
- Removed inactive left-rail tool placeholders and compressed terminal headers to preserve terminal space.
- Replaced the manual 2-Up/2x2 selector with automatic terminal arrangement based on pane count.
- Added animated terminal focus mode with selectable edge previews, header controls, double-click, and keyboard restore.
- Kept tab-owned terminal sessions alive across tab switches by parking and reattaching their xterm surfaces.
- Added stable, renameable terminal identities and command-history source labels that follow terminal renames.
- Prevented duplicate PTYs by coalescing overlapping terminal starts in Angular and Electron and reusing running sessions by stable terminal ID.
- Reworked the inspector into a compact fact-list layout without duplicated workspace or tab context cards.
- Removed accidental terminal scroll tracks and theme-mismatched viewport seams.
- Hardened Windows PTY lifecycle handling for multi-pane startup and teardown pressure.
- Added branded Windows installer and zip packaging, CI artifacts, and install/upgrade persistence validation.
- Completed the terminal workspace shell, persistence, session recovery, split panes, command palette, search, inspector, utility dock, and system theme work.

### Known limitation

The Windows artifacts are unsigned. SmartScreen warnings are expected until Authenticode signing is configured with a certificate.
