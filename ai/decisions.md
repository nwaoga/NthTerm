# NthTerm Decisions

## 2026-06-17
- The source code lives directly in the repository root at `D:\source\repos\NthTerm`.
- Project continuity and planning documents now live in the repo-local `ai` folder so they can travel across machines; machine-local secrets stay in ignored local-only folders.
- Phase 1 will prioritize a minimal vertical slice: Electron window, Angular renderer, preload bridge, and one `node-pty` backed terminal.
- PTY lifecycle and process ownership stay in Electron main process code, with Angular limited to rendering and user interaction.
- The source repo was bootstrapped as a fresh Angular 19 standalone application because the linked repo target was empty.
- Electron integration uses plain JavaScript `electron/main.js` and `electron/preload.js` for a small first slice, while Angular remains TypeScript-based.
- Renderer-to-PTY communication goes through a preload bridge exposed as `window.nthTermTerminal`, with Angular consuming it through a dedicated bridge service.
- The first terminal shell defaults to `powershell.exe -NoLogo` on Windows, with platform-aware shell fallbacks for macOS and Linux.
- Development runs Angular on `http://127.0.0.1:4200` and points Electron at that URL; production Electron loads the built Angular files from `dist/nthterm/browser/index.html`.
- The initial Angular production bundle exceeds the default 500 kB warning budget because of xterm.js. This is acceptable for the Phase 1 proof and can be optimized later.
- The first persistence slice uses `sql.js` in Electron main rather than a native SQLite binding so we can avoid Electron native-module rebuild complexity while still storing data in a SQLite database file.
- Phase 2 starts with a single default workspace record instead of a full multi-workspace model, which keeps the save/restore path small while preserving room for tabs, panes, startup commands, and history later.
- The primary shell layout story is being implemented as a structural UI slice first: one live PTY-backed pane remains functional while the left rail, top toolbar, right inspector, bottom dock, and status bar are introduced with representative placeholder content for subsequent stories.
- The sessions sidebar now uses persisted workspace records instead of hard-coded entries, and template actions create real workspace rows immediately.
- Active workspace selection is tracked in a lightweight `app_state` table in SQLite so the renderer can load and switch the current workspace through Electron-managed state.
- Workspace persistence now stores `layoutMode`, `launchProfile`, and a lightweight `sessionSnapshot` JSON payload per workspace so future tab and split-pane restore work can build on a stable persistence contract.
- Terminal tabs now read from and write back to the workspace `sessionSnapshot`, which makes the top tab strip part of the persisted workspace state rather than a separate UI-only construct.
- Split-pane state is persisted as `focusedPaneId` plus a small pane-to-tab assignment list inside `sessionSnapshot.layout`, which keeps pane restoration simple without moving PTY ownership out of Electron main.
- Only the focused pane hosts the live xterm surface in the current slice; non-focused panes render assignment summaries until we introduce concurrent PTY sessions in a later story.
- Session inspector data now comes from a lightweight Electron terminal metadata channel rather than Angular-derived guesses; Electron tracks shell name, PID, start time, last activity, exit code, and a simple detected port hint per live PTY session.
- `Stop` is implemented as an interrupt (`Ctrl+C`) against the active PTY, while `Kill` disposes the session and `Restart` creates a fresh PTY for the focused pane.

## 2026-06-19
- Bottom utility dock tabs now switch between Output, Problems, Search, and Command History panels using the same active-tab pattern as the right inspector.
- Output logs append from workspace and terminal lifecycle events in Angular rather than hard-coded placeholder lines.
- Problems are detected heuristically from PTY output lines containing error or warning keywords.
- Command history captures Enter-submitted input from the focused terminal and powers both the dock panel and inspector recent commands list.
- Workspace search in the dock filters workspaces, tabs, command history, and output logs client-side; the toolbar Search button and left-rail Command History link open the corresponding dock tab.

## 2026-06-19 (continued)
- System monitor widgets in the Output dock tab poll Electron main every 3 seconds for CPU, memory, disk, and network metrics via a new `system` preload bridge.
- Environment variables for the active PTY session are captured at spawn time, enriched with `NTH_TERM_WORKSPACE`, and exposed through `system:get-session-environment` for the inspector panel.

## 2026-06-19 (Phase 3)
- Command palette opens from the toolbar, `Ctrl+Shift+P`, and lists workspace actions plus filtered search results in one overlay.
- Global workspace search expands to templates, panes, problems, and output logs; `Ctrl+Shift+F` and the Search toolbar button open the palette in search mode and sync with the bottom Search panel.
- Search and palette results are actionable: selecting a workspace, tab, template, pane, command, problem, or output entry runs the corresponding app action.

## 2026-06-19 (launch restore)
- App launch now uses `workspace:get-launch` to restore the last active workspace, including tabs, panes, and layout from SQLite.
- Invalid saved directories fall back to the user home directory so PTY creation does not fail with Windows error 267.
- The renderer persists the current workspace and active workspace id on app shutdown through an Electron `app:before-quit` bridge.

## 2026-06-20
- Tab records in `sessionSnapshot` now store `shell` and `startupCommand` fields, edited from the focused pane toolbar and shown in the tab inspector.
- Electron resolves shell preferences (`powershell`, `cmd`, `bash`, `zsh`, or system default) when spawning PTY sessions.
- Startup commands run automatically after a tab session connects; multiple commands are supported via newline-separated input.

## 2026-06-20 (Phase 4)
- Workspace rename and delete are exposed from the sessions sidebar with inline rename and confirm-before-delete.
- Delete is blocked when only one workspace remains; deleting the active workspace switches to the first remaining row and clears the live PTY session first.
- Rename and delete persist through new `workspace:rename` and `workspace:delete` IPC handlers backed by SQLite updates in `workspace-store.js`.

## 2026-06-21
- Decomposed the monolithic `AppComponent` into feature folders, injectable services, and shell feature components per `architecture.md` code-style rules.
- Shared shell styling moved to `src/app/styles/shell.css` and imported globally from `src/styles.css`.
- Electron uses a frameless window (`titleBarStyle: hidden`, `titleBarOverlay`) with renderer drag regions on the toolbar, left rail, and status bar.
- Bottom utility panel is visible by default; visibility persists in `localStorage` and toggles from Appearance preferences.
- Pane column/row splits persist in `sessionSnapshot.layout` (`colSplit`, `rowSplit`).

## 2026-06-23
- Workspace snapshots now persist a capped `sessionSnapshot.history` list plus `sessionSnapshot.recovery` metadata for the latest launch, stop reason, exit code, and attached pane/tab.
- Terminal lifecycle events append recovery-oriented history entries on launch, normal exit, error exit, and inspector kill so workspace restore has concrete context rather than only saved tab state.
- The right inspector now surfaces the latest recovery metadata and a compact saved session-history list in addition to live PTY details.
- Multi-pane restore now keeps one xterm surface and one PTY session per assigned visible pane, while the focused pane only controls which session drives inspector metadata and environment details.
- Pane layout snapshot entries now carry lightweight per-pane session metadata so workspace persistence records PID/status/timestamps per pane without introducing a separate session table yet.

## 2026-06-27
- `#110` design-alignment work now includes a Windows-specific top-shell correction: macOS traffic lights are hidden on Windows, and the toolbar reserves right-side space for native caption buttons so the OS controls no longer overlap app chrome.
- The desktop shell header now uses a more reference-like grouping with a centered workspace switcher, stronger top-bar segmentation, and a denser footer/status treatment, while still respecting Electron title-bar constraints on Windows.
