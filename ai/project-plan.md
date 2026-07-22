# NthTerm Project Plan

## Product
NthTerm is a cross-platform rich terminal workspace manager built with Angular, Electron, xterm.js, node-pty, and SQLite.

## Intent
Users should be able to create, save, restore, and manage terminal workspaces with multiple tabs, panes, startup commands, working directories, and session history.

## Delivery Approach
- Prefer small, incremental stories and commits.
- Keep PTY and process logic in Electron main process code, not Angular components.
- Keep renderer code split by feature; avoid new god files (see `architecture.md`).
- Source code and project continuity docs now live together in the repository root; shared notes live in `ai/`, while machine-local secrets stay outside that folder.
- GitHub: `https://github.com/nwaoga/NthTerm` (`main`).
- Azure DevOps project: `blakboi/NthTerm`.

---

## Current State (2026-07-22)

**Phase:** RC1 usability polish complete. Feature roadmap and unsigned Windows packaging track are complete.

**Working today:**
- Electron + Angular shell with concurrent PTY-backed pane sessions across visible splits
- Tab-owned terminal sessions that stay alive across tab switches and are parked/reattached without PTY teardown
- Stable terminal IDs with renderer and Electron single-flight guards that prevent duplicate PTYs during overlapping restores
- SQLite workspace persistence (tabs, pane layout, splits, rename/delete, recovery metadata)
- Feature-oriented renderer refactor (services + shell components)
- Command palette, global search (keyboard + dock), utility panels, inspector, system monitor
- System themes for app chrome: Midnight, Coffee, White (terminal colors stay separate)
- Settings modal (gear in toolbar) for workspace appearance, terminal defaults, and ANSI palette
- Rich terminal ANSI output with VS Code–style palettes and explicit Git status colors
- Toolbar cleanup: workspace actions left-aligned; search/dock shortcut buttons removed
- Animated terminal focus mode with visible peer previews and `Ctrl+Shift+Enter` restore
- Stacked focus/overview terminal layout (≤10) with `Ctrl+\` overview toggle and compact stack navigation
- Bottom dock resize keeps output and system monitor panels aligned
- Frameless desktop window with per-theme Windows title bar overlay
- Electron Builder packaging configuration for local unpacked builds and Windows release artifacts
- Release branding assets (app icon + NSIS installer chrome) with documented unsigned-vs-signed signing path
- Unsigned NSIS install/reinstall validated on Windows with AppData persistence preserved
- Right inspector rail can be hidden/restored with a persisted local preference and command palette actions
- Active workspace shell profile controls default shell creation before falling back to the app default
- Windows builds discover installed WSL distributions and expose them as selectable shell profiles
- Compact windows preserve the terminal workspace through condensed toolbar controls, viewport-aware dock sizing, and an on-demand inspector overlay
- Workspace tabs and layout controls expose keyboard and assistive-technology state correctly
- Workspace, tab, and terminal ownership is explicit through breadcrumbs, contextual Start/Split actions, and shell-based terminal names
- New tabs start with the resolved workspace/app-default terminal, while layout controls appear only for multi-terminal tabs
- Tabs support inline rename, drag reorder, duplicate, close/reopen, and running-terminal indicators
- Tab and terminal context menus keep lifecycle actions near the object they affect
- The inspector has compact workspace, tab, and terminal modes with one identity overview, non-duplicated facts, and settings attached to the correct level
- Terminal names persist independently from PTY sessions, and command history resolves attribution through stable terminal IDs
- The workspace dock can collapse and remembers visibility and height independently for each workspace
- Keyboard workflows cover tab creation/closing/cycling, terminal cycling/splitting, and dock toggling
- Destructive prompts appear only when the affected workspace, tab, or terminal owns a live process
- Inactive tool placeholders were removed from the workspace rail
- Terminal arrangement now follows pane count automatically instead of exposing 2-Up and 2x2 implementation modes

**Last shipped:** RC1 post-verification terminal lifecycle, focus-layout, history attribution, and inspector-density pass.

## Handover — 2026-07-22

- Commit `29902e7` adds macOS-specific shell polish: an opaque application canvas over Electron vibrancy, reduced glass blur, and native macOS UI/monospace font stacks. These changes are scoped to `data-host-platform="darwin"`; Windows chrome and acrylic behavior are unchanged.
- The shared left-rail “New Workspace” action is now full-width and single-line. The System Monitor uses a compact four-metric row in short windows so all readings stay visible; these two layout fixes apply on both macOS and Windows.
- Verification completed: `npm run build` passed (the existing initial-bundle budget warning remains). The affected Angular specs passed: 10 app-shell specs and 12 left-rail/bottom-dock specs.
- `npm run test:ci` passes on macOS and Windows. Shell pickers stay platform-filtered, while persisted Windows/WSL shell labels still resolve for display on macOS/Linux.
- Azure DevOps closed stories for this batch: [#135](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/135) stacked layout, [#136](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/136) glass chrome, [#137](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/137) macOS packaging/CI (`cf83d64`).
- The working tree intentionally leaves `package-lock.json` modified and uncommitted; inspect it separately before committing or discarding it.

**Release target:** `0.1.0-rc.1` (unsigned Windows RC). Authenticode signing remains deferred until a certificate is available.

**Reference design:** `repo/docs/target-ui-reference.png` (Phase 4 visual baseline; Phase 5 should preserve it while adding production readiness).

---

## RC1 Readiness

**Status:** Done (2026-07-17).

**Scope:**
- Version the app as `0.1.0-rc.1` and publish a concise changelog.
- Add a repeatable `npm run rc:verify` path for build, unit tests, Windows artifacts, and installer upgrade/persistence validation.
- Run CI release builds on version tags as well as the existing PR and `main` triggers.
- Reconcile README and continuity docs with the shipped inspector, workspace shell profile, and WSL distro work.

**Completion criteria:**
- `npm run rc:verify` passes locally.
- `npm run build` and `npm run test:ci` pass.
- The release artifact reports `0.1.0-rc.1` and the installed app passes the existing health/persistence checks.
- The unsigned SmartScreen constraint is documented clearly.

**Verified:** `npm run rc:verify` passed end to end for `0.1.0-rc.1`, including `npm run build`, `npm run test:ci` (18 Electron checks, 90 Angular specs), `npm run release:win`, and the installed-app upgrade/persistence smoke test. The versioned installer and zip are present under ignored `release/` output.

## RC1 Post-Verification Polish

**Status:** Done (2026-07-17).

**Scope delivered:**
- Automatic two-pane/four-area arrangement with all terminals retained and a focused-terminal zoom mode with visible peers.
- xterm viewport cleanup, hidden horizontal scroll tracks, and theme-correct viewport remainder colors.
- Tab switching that parks and reattaches live xterm surfaces without killing their PTYs.
- Stable terminal naming and command-history attribution by terminal ID, with current names resolved at render time.
- Single-flight terminal creation in Angular and Electron, plus running-session reuse by stable terminal ID.
- Compact inspector hierarchy that removes duplicate workspace/tab facts and replaces large metric tiles with horizontal fact rows.
- Full-window Electron visual verification across the live terminal stage and inspector.

**Latest verification:** `npm run build` passed with the accepted bundle-budget warning; `npm run test:ci` passed with 29 Electron checks and 120 Angular specs.

## Next Release Gate

Recommended order for the next session:

1. [#138](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/138) — Run `npm run rc:verify` so Windows installer/upgrade evidence matches the current candidate (stacked layout, glass chrome, macOS packaging, shell CI fixes), then tag only if green.
2. [#139](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/139) — On macOS, run `npm run release:mac` and smoke-test the unsigned dmg/zip (Gatekeeper warnings expected).
3. [#140](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/140) — Polish stacked focus/overview day-to-day UX from Mac/Windows feedback.
4. Keep Authenticode signing / Apple notarization deferred until certificates are available.

Closed this session: [#135](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/135), [#136](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/136), [#137](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/137).

## Historical Delivery Tracks

The completed tracks below are retained as delivery history and acceptance context.

### Phase 5 Task 1 — Production desktop packaging

**Status:** Done.

**Scope:**
- Add repeatable Electron Builder scripts for unpacked local builds, current-platform release builds, and Windows artifacts.
- Package the production Angular renderer from `dist/nthterm/browser` with the Electron main/preload files.
- Keep generated release artifacts out of source control.
- Preserve the current dev flow (`npm start`) while making production desktop launch/package commands explicit.

**Key files:**
- `repo/package.json` — package scripts, Electron Builder metadata, native module unpacking
- `repo/.gitignore` — generated release artifacts
- `repo/electron/main.js` — production asset loading path

**Acceptance criteria:**
- `npm run build` succeeds.
- `npm run test:ci` succeeds.
- `npm run package` creates a local unpacked desktop build without requiring a signing certificate.
- Release artifacts are ignored by git.

**Out of scope:** code signing, auto-update channels, installer branding/icon work, and CI release automation.

### Phase 5 Task 2 — Packaged desktop runtime smoke test

**Status:** Done.

**Scope:**
- Launch the unpacked Windows desktop build created by Electron Builder.
- Confirm the packaged process stays alive long enough to load local production assets.
- Confirm the packaged app initializes workspace persistence and the PTY-backed shell path.
- Record any runtime constraints before moving to installer branding, signing, or CI automation.

**Key files/artifacts:**
- `repo/release/win-unpacked/NthTerm.exe` — ignored local package output
- `repo/electron/main.js` — production renderer load and PTY IPC handlers
- `repo/electron/workspace-store.js` — packaged persistence initialization

**Acceptance criteria:**
- Packaged executable launches without immediate crash.
- App process remains healthy during the smoke window.
- Workspace persistence/user-data initialization succeeds.
- Any packaged-runtime caveats are documented in `decisions.md`.

**Out of scope:** long-form manual UI QA, signed installer install/uninstall testing, and auto-update validation.

### Phase 5 Task 3 — GitHub Actions release build workflow

**Status:** Done.

**ADO:** [#118](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/118)

**Scope:**
- Add a GitHub Actions workflow that validates the app on pull requests and pushes to `main`.
- Run dependency install, `npm run build`, and `npm run test:ci`.
- Build unsigned Windows installer/zip artifacts with `npm run release:win`.
- Upload generated release artifacts from `release/` for manual download.
- Document any CI-specific native module, cache, artifact, or signing constraints.

**Key files:**
- `repo/.github/workflows/` — CI/release workflow definitions
- `repo/package.json` — existing build/test/package scripts
- `repo/README.md` — build instructions once CI exists

**Acceptance criteria:**
- GitHub Actions runs build and tests on PRs and `main`.
- Windows release job produces installer/zip artifacts.
- Artifacts are available from the workflow run without committing generated files.
- Workflow does not require signing secrets for the unsigned build path.

**Out of scope:** Azure Pipelines, code signing certificates, auto-publishing GitHub Releases, and notarized macOS/Linux packages.

### Phase 5 Task 4 — Windows PTY stability

**Status:** Done.

**ADO:** [#122](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/122)

**Scope:**
- Reproduce `AttachConsole failed` and related Windows PTY errors under 2-up and 2x2 loads.
- Identify whether failures come from spawn timing, concurrent session creation, shell choice, or packaged vs dev runtime differences.
- Apply the smallest reliable fix or mitigation in Electron main / terminal session coordination.
- Add regression coverage where practical for the affected spawn path.

**Implemented so far:**
- Electron main now serializes PTY spawns through `electron/terminal-spawn-coordinator.js` with Windows spacing, retry on retryable spawn errors, and explicit ConPTY options.
- Renderer restore calls are serialized through `TerminalHostCoordinatorService` to prevent overlapping multi-pane session bootstraps.
- Retry classification now includes additional transient Windows PTY/load failures such as `EIO`, `EBUSY`, access-denied/permission races, and failed process launch messages.
- PTY dispose/kill cooldown now runs even when cleanup throws, preserving spacing before the next spawn.
- Regression coverage was added for the new retry classifications and dispose-failure cooldown path.
- Local Windows PTY stress verification passed with 40 spawned/disposed PTYs across repeated 2-up, 2x2, and rapid-restart cycles.
- Production Electron smoke launch stayed alive during the verification window with no PTY startup failures observed.

**Out of scope:** macOS/Linux PTY work unless required by a shared fix.

### Phase 5 Task 5 — Release branding and signing readiness

**Status:** Done.

**ADO:** [#123](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/123)

**Scope:**
- Add application icon and installer branding assets for Electron Builder.
- Wire icon/branding metadata into `package.json` / electron-builder config.
- Document unsigned vs signed release paths and required certificate/secrets for future signing.
- Keep GitHub Actions producing unsigned artifacts without requiring secrets in the first slice.

**Implemented:**
- Committed `build/` branding assets (icon PNG/ICO, NSIS installer icons, header/sidebar BMPs) and `public/favicon.ico`.
- Electron Builder `win.icon` + `nsis.*` branding fields wired; runtime window icon resolves `build/icon.ico`.
- README documents unsigned default vs future `CSC_LINK` / `CSC_KEY_PASSWORD` signed path.
- Regression specs assert branding assets exist and package config stays unsigned-by-default.

**Out of scope:** purchasing certificates, auto-update channels, macOS notarization, Linux packaging.

### Phase 5 Task 6 — Installer and upgrade validation

**Status:** Done.

**ADO:** [#124](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/124)

**Scope:**
- Install from the unsigned NSIS artifact produced by GitHub Actions or `npm run release:win`.
- Verify packaged app launch, workspace persistence, and PTY startup from the installed location.
- Test upgrade/reinstall over an existing install and confirm AppData user data is preserved.
- Document installer/runtime constraints in `decisions.md`.

**Verified locally (2026-07-12):**
- Silent install of `release/NthTerm-0.0.0-win-x64.exe` to `%LOCALAPPDATA%\Programs\NthTerm`
- Installed `NthTerm.exe` stayed alive; ConPTY/shell children observed
- `%APPDATA%\NthTerm` marker + `nthterm.sqlite` survived silent reinstall
- Post-upgrade launch stayed healthy
- Repeat script: `scripts/validate-windows-installer.ps1`

**Out of scope:** signed installer trust prompts beyond documenting SmartScreen behavior, auto-update delivery, macOS/Linux installer validation.

### Phase 6 — Shell picker and connected tab strip

**Status:** Done (2026-07-08).

**ADO:**
| ID | Title |
|----|-------|
| [#125](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/125) | Default shell preference for new terminals |
| [#126](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/126) | Add Terminal shell picker UI |
| [#127](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/127) | Inspector shell selection and restart guidance |
| [#128](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/128) | Trapezoid connected workspace tab strip |

**Shipped:** Default shell preference, split Add Terminal shell picker, inspector shell dropdown with restart guidance, and connected trapezoid workspace tab strip.

### Phase 7 — Shell polish, system themes, and rich terminal colors

**Status:** Done (2026-07-08).

**ADO:** [#129](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/129)

**Scope:**
- System themes for app chrome (`midnight`, `coffee`, `white`) with per-theme CSS tokens and Windows title bar overlay
- Settings modal moved from left rail to toolbar gear
- Remove templates rail section; toolbar search/dock shortcut cleanup and left-aligned action cluster
- Bottom dock resize alignment for split output/monitor panels
- Terminal ANSI palettes (VS Code Dark+/Light+, Dracula, Monokai, One Dark, Solarized Dark, Nord) with Settings picker
- Spawn-time color env (`FORCE_COLOR`, Git `color.status.*`, PowerShell 7 preference when installed)
- Split global search (dock tab + `Ctrl+Shift+F`) from command palette overlay

**Acceptance criteria met:**
- `npm run build` and `npm run test:ci` pass (78 tests)
- Git status shows semantic colors (green branch, red modified, magenta untracked)
- Light themes no longer leak dark inspector/dock surfaces or purple scrollbars

**Scope:**
- Persist a default shell preference for new terminals and expose it in left-rail Preferences.
- Split the toolbar **Add Terminal** action so users can pick PowerShell, CMD, Bash, or Zsh before spawn.
- Let the inspector edit the focused terminal shell draft with restart guidance.
- Restyle workspace tabs as single-line, trapezoid tabs connected to the stage body (icon + title + close).

**Key files:**
- `src/app/preferences/app-preferences.service.ts`
- `src/app/shell-toolbar/`
- `src/app/workspace/workspace-area.component.*`
- `src/app/left-rail/`
- `src/app/styles/shell.css`

**Acceptance criteria:**
- Default shell preference persists and is used when Add Terminal is clicked without an explicit shell.
- Toolbar and empty-state flows can create terminals with a chosen shell.
- Inspector shell dropdown updates the focused terminal draft and documents restart requirement.
- Tab strip matches the connected trapezoid tab pattern from the design reference.
- `npm run build` and `npm run test:ci` pass.

**Out of scope:** per-workspace shell profiles, WSL distro picker, concurrent background tab PTY persistence.

### Option A — Concurrent multi-pane PTY sessions

**Status:** Implemented in code on 2026-06-23. Keep this section as the architectural reference for follow-up fixes or refinements.

**ADO:** Delivered through the Phase 4/5 terminal lifecycle work, with later stability hardening tracked on #122.

**Scope:**
- One xterm instance + one PTY session per visible pane (or attach/detach pool with stable pane IDs)
- Focus changes update inspector, status bar, and input routing to the active pane session
- Persist session metadata per pane in workspace `sessionSnapshot`
- Restore all visible pane sessions on workspace load; dispose on pane close or workspace switch
- Resize each pane's terminal independently on split drag

**Key files:**
- `repo/src/app/terminal/terminal-session.service.ts` — per-terminal xterm/session map with parking and single-flight startup
- `repo/src/app/terminal/terminal-host-coordinator.service.ts`
- `repo/src/app/workspace/workspace-area.component.ts` — pane grid + terminal host elements
- `repo/src/app/workspace/workspace-runtime.service.ts` — pane/tab snapshot models
- `repo/electron/` — PTY IPC if batch create/restore APIs are needed

**Acceptance criteria met in code:**
- In `2-up` or `2x2`, each pane runs its own shell concurrently
- Switching focused pane switches live input and inspector metadata
- Save workspace → reload app → all pane sessions restore (or clear relaunch per pane cwd/tab binding)
- No regression: single-pane and single-tab flows still work
- Add/update unit tests for session-per-pane coordination

**Out of scope for this option:** Session history UI, design pixel polish.

---

### Option B — Session history and recovery metadata

**Status:** Implemented in code on 2026-06-23.

**ADO:** Create a new story when picked up.

**Scope:**
- Define what to record: commands, cwd, exit status, timestamps, workspace/pane/tab linkage
- SQLite schema + Electron persistence service for history records
- IPC: append/query history; optional prune/retention policy
- Surface in UI: inspector section and/or command history panel (reuse `utility-panel/`)
- Richer recovery: restore last known good session state after crash or forced kill

**Key files:**
- `repo/electron/` — workspace store, session/PTY services (find existing SQLite layer)
- `repo/src/app/models/` — new history types
- `repo/src/app/utility-panel/` or `inspector/` — presentation
- `repo/src/app/workspace/workspace-runtime.service.ts` — hook lifecycle events

**Acceptance criteria:**
- History persists across app restarts
- User can view recent commands/sessions for active workspace
- Recovery path documented in `decisions.md` if behavior is best-effort vs guaranteed

**Out of scope:** Multi-pane PTY (Option A), full design pass.

---

### Option C — Design alignment (visual fidelity pass)

**Why:** Match `docs/target-ui-reference.png` as closely as runtime allows. Good if the goal is demo/screenshot quality before deeper PTY work.

**ADO stories:**
| ID | Title |
|----|-------|
| [#110](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/110) | Desktop chrome and top shell |
| [#111](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/111) | Center workspace composition |
| [#112](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/112) | Sidebar and tab hierarchy |
| [#113](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/113) | Right inspector cards |
| [#114](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/114) | Bottom dock and system monitor |
| [#115](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/115) | Seed realistic review content |

**Suggested order within Option C:** continue the visual-language pass, then document remaining deviations.

**Completed on #110:** The shared top shell now spans the full app width with Windows-safe caption spacing, calmer workspace context, clearer action grouping, and stronger titlebar rhythm that better matches the reference without duplicating session navigation.

**Completed on #111:** Commit `c02fff0` aligned the center workspace composition more closely to the reference with a dedicated workspace stage, denser pane framing, wider split gutters, and improved pane metadata hierarchy.

**Completed on #112:** The sidebar and tab hierarchy now track the reference more closely through icon-led tab labels, stronger active workspace emphasis, tighter sidebar row hierarchy, and more deliberate spacing across sessions, tools, templates, and settings.

**Completed on #113:** The right inspector now uses a more reference-like structure with a dedicated hero card, separated tab and live-session views, grouped workspace/recovery metadata, stronger badges, and clearer history/environment sections.

**RC1 follow-up:** User testing retained the #113 data model but replaced the large hero/metric-card stack with a compact identity, fact-list, settings, and secondary-detail hierarchy. This intentional deviation is recorded in `decisions.md`.

**Completed on #114:** The bottom dock now reads closer to the reference through a dedicated dock header, stronger tab strip, denser output/problem/history rows, richer search summaries, and more deliberate telemetry cards in the system monitor.

**Key files:**
- `repo/src/app/styles/shell.css` — primary styling surface
- Feature components: `shell-toolbar/`, `left-rail/`, `workspace-area/`, `bottom-dock/`, `status-bar/`
- `repo/README.md` — design alignment checklist (check off items as completed)

**Acceptance criteria:**
- Side-by-side comparison with reference meets checklist items for the chosen ADO story
- Document unavoidable deviations in `decisions.md` (Electron/PTY constraints)
- Close corresponding ADO story when checklist slice is done

**Out of scope:** New PTY architecture unless required for layout.

---

## Recommended Priority (default if user does not specify)

1. Keep packaged runtime smoke / installer validation in mind before changing `asar`, native module, or persistence paths.
2. Signed release workflow remains deferred until an Authenticode certificate is available.

---

## Agent Handoff Checklist

When starting a session, read:
1. `ai/project-plan.md` (this file) — pick a track
2. `ai/architecture.md` — code layout and constraints
3. `ai/stories.md` — mark backlog item in progress / done
4. `ai/decisions.md` — log non-obvious choices
5. `repo/README.md` — current status and design checklist

When finishing:
- Run `npm test` and `npm run build` in `repo/`
- Update `stories.md` and `decisions.md`
- Commit + push if user asks
- Create/close ADO work item with link to commit

---

## Phases (historical)

### Phase 1: App Shell and Terminal Proof — done
### Phase 2: Workspace Model — done
### Phase 3: Multi-Tab and Layout — done
### Phase 4: Session History and Management — done
- Delivered rename/delete, renderer refactor, frameless chrome, session history and recovery metadata, concurrent multi-pane PTY sessions, full design-alignment pass (#110–#115), visual language tokens, documented deviations, and screenshot-reviewed closeout against `docs/target-ui-reference.png`
