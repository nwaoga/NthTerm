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

## Current State (2026-07-08)

**Phase:** 7 shipped (shell polish + terminal theming). Phase 5 Task 4 (#122) still in progress.

**Working today:**
- Electron + Angular shell with concurrent PTY-backed pane sessions across visible splits
- Tab-owned terminal sessions that stay alive across tab switches in the same pane
- SQLite workspace persistence (tabs, pane layout, splits, rename/delete, recovery metadata)
- Feature-oriented renderer refactor (services + shell components)
- Command palette, global search (keyboard + dock), utility panels, inspector, system monitor
- System themes for app chrome: Midnight, Coffee, White (terminal colors stay separate)
- Settings modal (gear in toolbar) for workspace appearance, terminal defaults, and ANSI palette
- Rich terminal ANSI output with VS Code–style palettes and explicit Git status colors
- Toolbar cleanup: workspace actions left-aligned; search/dock shortcut buttons removed
- Bottom dock resize keeps output and system monitor panels aligned
- Frameless desktop window with per-theme Windows title bar overlay
- Electron Builder packaging configuration for local unpacked builds and Windows release artifacts

**Last shipped:** Phase 7 shell polish and terminal theming (system themes, settings modal, ANSI palettes, toolbar/dock alignment, spawn-time color env).

**Reference design:** `repo/docs/target-ui-reference.png` (Phase 4 visual baseline; Phase 5 should preserve it while adding production readiness).

---

## Pick Next Work

Choose **one** track below. Each is scoped for a single agent session or small PR series. Update `stories.md`, `decisions.md`, and ADO when done.

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

**Status:** In progress.

**ADO:** [#122](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/122)

**Scope:**
- Reproduce `AttachConsole failed` and related Windows PTY errors under 2-up and 2x2 loads.
- Identify whether failures come from spawn timing, concurrent session creation, shell choice, or packaged vs dev runtime differences.
- Apply the smallest reliable fix or mitigation in Electron main / terminal session coordination.
- Add regression coverage where practical for the affected spawn path.

**Implemented so far:**
- Electron main now serializes PTY spawns through `electron/terminal-spawn-coordinator.js` with Windows spacing, retry on retryable spawn errors, and explicit ConPTY options.
- Renderer restore calls are serialized through `TerminalHostCoordinatorService` to prevent overlapping multi-pane session bootstraps.

**Out of scope:** macOS/Linux PTY work unless required by a shared fix.

### Phase 5 Task 5 — Release branding and signing readiness

**Status:** Backlog.

**ADO:** [#123](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/123)

**Scope:**
- Add application icon and installer branding assets for Electron Builder.
- Wire icon/branding metadata into `package.json` / electron-builder config.
- Document unsigned vs signed release paths and required certificate/secrets for future signing.
- Keep GitHub Actions producing unsigned artifacts without requiring secrets in the first slice.

**Out of scope:** purchasing certificates, auto-update channels, macOS notarization, Linux packaging.

### Phase 5 Task 6 — Installer and upgrade validation

**Status:** Backlog.

**ADO:** [#124](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/124)

**Scope:**
- Install from the unsigned NSIS artifact produced by GitHub Actions or `npm run release:win`.
- Verify packaged app launch, workspace persistence, and PTY startup from the installed location.
- Test upgrade/reinstall over an existing install and confirm AppData user data is preserved.
- Document installer/runtime constraints in `decisions.md`.

**Out of scope:** signed installer trust prompts beyond documenting SmartScreen behavior, auto-update delivery, macOS/Linux installer validation.

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

**ADO:** Create a new story or extend Phase 4 backlog item in `stories.md`.

**Scope:**
- One xterm instance + one PTY session per visible pane (or attach/detach pool with stable pane IDs)
- Focus changes update inspector, status bar, and input routing to the active pane session
- Persist session metadata per pane in workspace `sessionSnapshot`
- Restore all visible pane sessions on workspace load; dispose on pane close or workspace switch
- Resize each pane's terminal independently on split drag

**Key files:**
- `repo/src/app/terminal/terminal-session.service.ts` — today single-session; needs per-pane map or coordinator
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

1. **Phase 5 Task 4 / #122** — Windows PTY stability under multi-pane load (verify AttachConsole mitigation in daily use).
2. **Task 5 / #123** branding/signing readiness or **Task 6 / #124** installer validation.
3. Optional follow-ups: inspector hide toggle, per-workspace shell profiles, WSL distro picker.
4. Keep packaged runtime smoke coverage in mind before changing `asar`, native module, or persistence paths.

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
