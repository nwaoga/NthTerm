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

## Current State (2026-06-27)

**Phase:** 4 in progress.

**Working today:**
- Electron + Angular shell with concurrent PTY-backed pane sessions across visible splits
- SQLite workspace persistence (tabs, pane layout, splits, rename/delete, recovery metadata)
- Feature-oriented renderer refactor (services + shell components)
- Command palette, global search, utility panels, inspector, system monitor
- Frameless desktop window with custom drag regions

**Last shipped:** Commit `3d93893` — desktop shell header polish for Windows-safe chrome spacing and top-shell grouping. ADO `#110` is in progress.

**Reference design:** `repo/docs/target-ui-reference.png` (1:1 fidelity is the Phase 4 visual goal).

---

## Pick Next Work

Choose **one** track below. Each is scoped for a single agent session or small PR series. Update `stories.md`, `decisions.md`, and ADO when done.

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

**ADO stories (all **New**):**
| ID | Title |
|----|-------|
| [#110](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/110) | Desktop chrome and top shell |
| [#111](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/111) | Center workspace composition |
| [#112](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/112) | Sidebar and tab hierarchy |
| [#113](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/113) | Right inspector cards |
| [#114](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/114) | Bottom dock and system monitor |
| [#115](https://dev.azure.com/blakboi/NthTerm/_workitems/edit/115) | Seed realistic review content |

**Suggested order within Option C:** #110 → #111 → #112 → #113 → #114 → #115.

**Partial progress on #110:** Frameless window and drag regions landed in `eee7121`; Windows-safe header spacing, workspace switcher centering, and top action regrouping landed in `3d93893`. Full 1:1 chrome is still open.

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

1. **Option C / #111** — center workspace composition
2. **Option C / #112** — sidebar and tab hierarchy
3. **Option C / #113** — right inspector cards
4. **Option C / #114** — bottom dock and system monitor
5. **Option C / #115** — seed realistic review content

User may override: for example, continue iterating on **Option C / #110** before moving deeper into the center workspace.

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
### Phase 4: Session History and Management — in progress
- Done: rename/delete, renderer refactor, frameless chrome (partial), session history and recovery metadata, concurrent multi-pane PTY sessions
- Open: design-alignment polish
