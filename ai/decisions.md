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

## 2026-07-02
- `#115` reference review content now lives in `ReferenceReviewContentService`, centralizing the Cloud POS sessions, dock logs, problems, telemetry, session history, recovery metadata, environment variables, and live-session preview context used for screenshot-ready reviews.
- Preview and supplemental Electron seed paths both reuse the same reference content service so browser and desktop demos stay aligned.
- `#114` bottom dock alignment now keeps the Output tab split between application logs and a persistent system monitor, with conic-gradient ring gauges, memory totals, and download/upload network formatting aligned to the reference.
- Preview output lines omit timestamp prefixes so the dock reads like the reference service log stream during design reviews.
- `#114` follow-up polish adds a dedicated workspace-dock header and denser panel summaries so the bottom band reads like a composed review surface instead of a plain tabbed utility tray.
- Output, problems, search, and command-history entries now share a more consistent card language, while the system monitor keeps the same telemetry data but presents it with stronger reference-like emphasis.
- `#111` center workspace composition now uses a staged workspace surface with tab strip metadata, tone-aware terminal cards, running-state pills, pane meta lines, and preview-mode terminal content aligned to the reference Cloud POS layout.
- Pane status/meta presentation moved into `WorkspaceRuntimeService` so the center grid stays data-driven instead of hard-coding per-tab strings in the template.
- Terminal input is sanitized in the renderer before forwarding to the PTY so focus-reporting and bracketed-paste control sequences do not pollute command history or swallow typed commands.
- Preview seeding and live workspace startup now follow separate paths so a real restored workspace does not remain stuck in preview mode after launch.
- The workspace dock height is now user-resizable and persisted locally, with terminal fit-sync triggered during drag so pane terminals keep a usable viewport while the bottom band changes size.
- Terminal session ownership now follows `tabId` rather than `paneId`, which lets live shells survive tab switches by parking inactive xterm surfaces off-screen and reattaching them when their tab becomes visible again.
- Hidden parked terminals are excluded from fit/resize propagation so their PTY dimensions are not collapsed to zero while they are off-screen.

## 2026-06-27
- `#110` design-alignment work now includes a Windows-specific top-shell correction: macOS traffic lights are hidden on Windows, and the toolbar reserves right-side space for native caption buttons so the OS controls no longer overlap app chrome.
- The desktop shell header now uses a more reference-like grouping with a centered workspace switcher, stronger top-bar segmentation, and a denser footer/status treatment, while still respecting Electron title-bar constraints on Windows.
- `#111` center-workspace alignment now wraps the tab strip and pane grid in a dedicated stage container so the middle column reads as one composed surface instead of disconnected blocks.
- Pane cards now use denser reference-like chrome: stronger rounded framing, clearer pane metadata hierarchy, inset terminal surfaces, and wider split gutters to better match the target composition without changing PTY ownership or workspace behavior.

## 2026-06-29
- Continued `#110` by restructuring the shell so the top toolbar spans both the sidebar lane and workspace lane, which better matches the reference's single integrated titlebar instead of a right-column-only header.
- The chrome pass keeps the sidebar below the shared toolbar while preserving existing feature wiring, so the titlebar layout moved without refactoring renderer feature ownership.

## 2026-07-01
- `#112` design-alignment work shifts the workspace tab strip toward the reference by using icon-led labels, stronger active-state emphasis, and denser metadata treatment instead of the flatter earlier tab styling.
- The left rail now uses tighter row hierarchy and more deliberate group rhythm across sessions, templates, tools, and settings so the sidebar reads closer to the target composition without changing workspace behavior.
- `#113` design-alignment work restructures the right rail into a hero summary card plus grouped metadata cards, which makes the inspector read closer to the target than the earlier flat stack of generic panels.
- The inspector now separates tab context from live-session diagnostics, keeping recovery/history/environment details available without mixing them into a single undifferentiated column.

## 2026-07-02 (`#110` closeout)
- The top shell no longer uses a second session-switching affordance in the header; the center band is passive workspace context so session navigation clearly belongs to the sidebar.
- `#110` now includes a full-width titlebar rhythm with tighter action grouping, calmer workspace context styling, and Windows-safe spacing for native caption controls.
- Creating a new session now has an explicit CTA in the Sessions section of the left rail; using Templates remains available for starter scenarios, but blank session creation is no longer hidden behind that mental model.
- New sessions now honor a persisted start-directory preference (`focused terminal`, `home directory`, or `custom path`) instead of inheriting a hard-coded empty-template path.
- The renderer asks Electron for directory defaults so `home directory` resolves from the host OS rather than duplicating platform-specific logic in Angular.
- Shared shell scrollbar styling is now centralized in global CSS with dark-mode-safe colors, rounded gradient thumbs, and stable scrollbar gutters on the primary scrolling surfaces to reduce layout jitter and visual inconsistency.

## 2026-07-03
- Phase 4 visual language is now centralized through shared shell CSS tokens for color, border, radius, spacing, typography, and elevation so the major surfaces use one reference-aligned design system instead of ad hoc per-panel values.
- Documented Phase 4 deviations from `docs/target-ui-reference.png`:
  - **Frameless Electron chrome:** Windows requires reserved caption-button space and omits macOS traffic lights, so the top shell cannot match the reference pixel-for-pixel on every OS.
  - **Live PTY output:** Electron sessions render real terminal streams in pane hosts, while the reference uses static screenshot text; preview mode remains the fair comparison path for design reviews.
  - **Windows PTY stability:** `node-pty` can emit `AttachConsole failed` under heavy multi-pane spawn/load; this is an environment/runtime constraint rather than a layout choice.
  - **Network telemetry:** live network metrics are sampled from the host and may expose a single throughput value unless download/upload split data is available; preview seeding keeps the reference-style up/down presentation for reviews.
  - **Dock resize:** the bottom workspace dock is user-resizable with persisted height, which is an intentional productivity enhancement beyond the static reference composition.
- Phase 4 screenshot review against `docs/target-ui-reference.png` passed on 2026-07-03 using browser preview mode; remaining differences are limited to the documented deviations above plus intentional productivity additions such as the workspace-dock header and New Session CTA.
- Phase 5 starts with production desktop packaging using Electron Builder because it fits the existing Electron entry point, Angular `dist/nthterm/browser` output, and npm-based workflow without requiring a larger build-system migration.
- The first packaging slice intentionally produces unsigned local artifacts only. Code signing, branded icons, auto-updates, and CI release automation are deferred until the local package path is proven.
- Electron Builder's automatic native rebuild is disabled for the default packaging path because this Windows environment is missing Visual Studio Spectre-mitigated libraries required to rebuild `node-pty`. The dedicated `npm run electron:rebuild` command remains available for machines with the full native toolchain.
- Phase 5 Task 1 is complete after verifying `npm run build`, `npm run test:ci`, `npm run package`, and `npm run release:win`.
- Phase 5 Task 2 starts with a short packaged-runtime smoke test against the unpacked Windows build before adding installer branding, signing, or release automation.
- Phase 5 Task 2 passed on 2026-07-03: `release/win-unpacked/NthTerm.exe` stayed healthy during the smoke window, initialized `C:\Users\blakb\AppData\Roaming\NthTerm\nthterm.sqlite`, and spawned a packaged `node-pty` PowerShell child process.
- Phase 5 Task 3 will use GitHub Actions for CI and unsigned Windows release artifacts because the repository source of truth is GitHub and the current package scripts already work locally without Azure-specific release infrastructure.
