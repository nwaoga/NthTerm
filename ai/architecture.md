# NthTerm Architecture

## System Shape

NthTerm is a single-window Electron desktop application with an Angular renderer. The renderer owns workspace interaction and xterm surfaces; Electron main owns operating-system processes, persistence, metrics, and the application window.

```text
Angular components
    -> Angular feature services
    -> typed bridge services
    -> preload/contextBridge
    -> Electron IPC handlers
    -> PTY, SQLite, system, and window services
```

The preload bridge is the trust boundary. Node APIs and `node-pty` are not exposed directly to Angular.

## Ownership Model

The user-facing hierarchy is:

```text
Workspace
  -> Terminal
      -> xterm surface + optional live PTY session
```

- A workspace owns terminals (up to ten), focused terminal, workspace defaults, recovery metadata, and dock preferences.
- Need another named context? Open another workspace (workspaces map to tmux sessions; terminals map to panes).
- A terminal has a stable persisted `terminalId`, optional user name, shell, cwd, startup command, theme, and latest session snapshot.
- A live PTY has a separate Electron-generated session ID. Session IDs are runtime handles and are never the terminal's product identity.
- Pane placement is presentation state. Moving, focusing, or zooming a terminal must not change its stable ID or create a second PTY.
- Legacy multi-tab `sessionSnapshot` payloads migrate on read by promoting the active tab's terminals only.

## Angular Renderer

### Components

`AppComponent` composes the shell and coordinates cross-feature application events. Feature components render the toolbar, workspace rail, terminal stage, inspector, utility dock, status bar, settings, and command palette.

Components should emit user intent and render service projections. Workspace, terminal, persistence, history, and preference rules belong in services.

### Workspace runtime

`WorkspaceRuntimeService` is the renderer's source of truth for the selected workspace, workspace-owned terminals, focused terminal, names, shell resolution, session history, and persistence drafts.

`workspace-snapshot.ts` normalizes legacy multi-tab and pane snapshots into the flat workspace-owned terminal model. Snapshot limit is ten terminals per workspace. Visual layout is a stacked focus/overview presentation (`WorkspaceLayoutService`) and is not a different persistence model: focus mode shows one interactive xterm; overview shows lightweight buffer previews. PTY processes stay alive across view changes; only the interactive host triggers FitAddon/PTY resize.

### Terminal runtime

`TerminalSessionService` keeps a state map keyed by stable `terminalId`. Each state may own:

- one xterm instance and fit addon
- one DOM container and current visible host
- one Electron PTY session ID
- one session metadata projection
- one in-flight start promise
- one command-input buffer

Visible terminals attach to live hosts. Terminals removed from the workspace are disposed. `TerminalHostCoordinatorService` serializes host discovery and restore passes after Angular renders the latest layout.

PTY creation is single-flight in both processes. The renderer coalesces overlapping starts per terminal; Electron uses `(webContentsId, terminalId)` to coalesce pending starts and reuse an existing running session. Disposal waits for an in-progress start so rapid close/switch operations cannot orphan a PTY.

### Inspector and utility data

`InspectorPresenterService` projects workspace and terminal data without owning runtime state. The inspector uses Workspace and Terminal modes with one compact identity/status overview, horizontal facts, mode-specific settings, and secondary recovery/history sections. Workspace facts are not repeated in a second context card.

Command history records stable `terminalId` references plus fallback titles. Display labels are resolved from current workspace state, so renaming a terminal updates attribution without rewriting history. Terminal input tracking runs inside Angular when publishing UI state.

### Local preferences

`AppPreferencesService` owns machine-local chrome preferences such as system theme, terminal defaults, ANSI palette, inspector visibility, and dock visibility/height. Workspace-owned defaults, including the workspace shell profile, remain in the persisted workspace record.

## Electron Main

### PTY lifecycle

Electron main is the only process allowed to spawn, write, resize, interrupt, or kill PTYs. Runtime sessions are stored by Electron session ID and scoped to their owning `webContents`.

`TerminalSpawnCoordinator` serializes Windows spawn/dispose operations, applies a cooldown around ConPTY teardown, and retries known transient Windows failures. `TerminalStartRegistry` adds stable-terminal deduplication above that queue. All sessions owned by a renderer are disposed when its `webContents` is destroyed.

Shell resolution supports the system default, PowerShell, Command Prompt, Bash, Zsh, and discovered WSL distributions encoded as `wsl:<distro>`. Spawn-time environment construction enables truecolor/tool color output and adds `NTH_TERM_WORKSPACE`.

### Persistence

`WorkspaceStore` uses `sql.js` and writes `%APPDATA%/NthTerm/nthterm.sqlite` on Windows. The schema has:

- `workspace_state`: workspace identity, cwd, shell profile, visual metadata, launch metadata, and JSON `session_snapshot`
- `app_state`: active workspace and other application-level keys

The snapshot contains workspace-owned terminals, layout/focus state, session metadata, capped history, and recovery state. Legacy multi-tab payloads migrate on read. Saved runtime PIDs/session IDs are diagnostic snapshots; launch creates or reuses a valid live session rather than assuming a persisted process survived.

Invalid saved directories fall back to the user home directory during launch normalization.

### Other bridges

- System IPC provides metrics and the focused session's environment projection.
- App IPC applies title-bar theme updates and coordinates graceful quit persistence.
- Workspace IPC provides CRUD, active-workspace selection, launch normalization, and directory defaults.

## Source Layout

| Area | Responsibility |
|------|----------------|
| `src/app/models/` | Shared renderer contracts |
| `src/app/workspace/` | Workspace runtime, snapshots, stage component, host/layout behavior |
| `src/app/terminal/` | xterm surfaces, PTY-session coordination, themes |
| `src/app/inspector/` | Inspector projections |
| `src/app/utility-panel/` | Output, problems, search, command history |
| `src/app/preferences/` | Machine-local UI preferences |
| `src/app/system/` | Metrics/environment presentation |
| `src/app/command-palette/` | Command and navigation dispatch |
| `src/app/*-bridge.service.ts` | Typed preload wrappers |
| `src/app/styles/shell.css` | Shared shell tokens and application layout |
| `electron/main.js` | Window setup and thin IPC registration |
| `electron/workspace-store.js` | SQLite workspace persistence |
| `electron/terminal-*.js` | PTY spawn, environment, stability, and start coordination |
| `electron/preload.js` | Context-isolated API exposure |

## Engineering Rules

- Keep process and PTY logic out of Angular.
- Keep IPC handlers thin and validate at the boundary.
- Use stable workspace/tab/terminal IDs for ownership and attribution.
- Do not dispose a terminal merely because its tab is inactive or its DOM host changed.
- Do not create more than one PTY for a stable terminal in one renderer.
- Prefer feature services over expanding `AppComponent` or `WorkspaceAreaComponent` with business rules.
- Keep theme tokens centralized and maintain usable light and dark themes.
- Every behavior or rendering change requires focused tests.
- Completion requires `npm run build` and `npm run test:ci`.

## Current Constraints

- Windows artifacts are unsigned until an Authenticode certificate is available.
- The Angular bundle exceeds the original 500 kB warning budget, primarily because of xterm.js; this is an accepted RC1 warning, not a failed build.
- Session restoration recreates process state from saved terminal configuration; it does not reconnect to arbitrary operating-system processes after an app restart.
