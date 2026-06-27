# NthTerm Architecture

## High-Level Structure
- repository root: source code plus local tooling notes
- `ai/`: planning and continuity docs for Codex-driven work that can be shared across machines

## Runtime Responsibilities
### Angular renderer
- Render the application UI
- Host xterm.js component(s)
- Handle user interaction and workspace management views
- Talk to Electron through a typed preload bridge

### Electron main process
- Own PTY lifecycle and process management
- Manage application windows
- Broker IPC calls between renderer and backend services
- Coordinate persistence services

### Persistence
- SQLite stores workspace definitions, pane settings, startup commands, and session history

## Design Constraints
- Keep PTY/process logic out of Angular components
- Use Electron main process for PTY management
- Use Angular for rendering and interaction
- Start with one clean dark theme

## Code Styles
- Do not put large features into one file.
- Split code by responsibility: UI, IPC, PTY, persistence, models, and configuration.
- Keep files small and focused; if a file is doing more than one job, split it.
- Prefer feature folders with clear names over generic folders like `utils`.
- Angular components should only handle view state and user events.
- Business logic belongs in Angular services or Electron main-process services.
- PTY lifecycle logic must live in dedicated Electron services, not IPC handlers.
- IPC handlers should be thin: validate input, call a service, return a result.
- Use typed request/response contracts for IPC.
- Use interfaces/types for shared models such as `TerminalSession`, `Workspace`, `Pane`, and `StartupCommand`.
- Avoid duplicate logic; extract reusable helpers only when reuse is real.
- Prefer dependency injection where possible instead of importing everything directly.
- Use clear naming over clever naming.
- Keep functions short and single-purpose.
- Add comments only where the reason is not obvious from the code.
- Add tests for services, IPC contracts, and persistence logic.

## Clean Code Rule
No “god files”. If a file grows beyond roughly 200–300 lines or mixes unrelated responsibilities, Codex should stop and refactor before adding more features.

## Renderer Layout (2026-06)
Feature-oriented Angular structure under `src/app/`:

| Area | Responsibility |
|------|----------------|
| `models/` | Shared UI contracts (`RuntimeTab`, `RuntimePane`, palette models, etc.) |
| `workspace/` | `WorkspaceRuntimeService` — tabs, panes, workspace CRUD, persistence drafts |
| `terminal/` | `TerminalSessionService`, `TerminalHostCoordinatorService` — xterm + PTY bridge |
| `utility-panel/` | Output, problems, command history |
| `command-palette/` | Palette/search orchestration |
| `preferences/` | Local UI preferences (bottom panel visibility) |
| `system/` | Metrics/env polling and formatting |
| `inspector/` | Inspector view-model presenter |
| Feature components | `left-rail`, `shell-toolbar`, `workspace-area`, `bottom-dock`, `status-bar`, `command-palette` |
| `styles/shell.css` | Global shell CSS imported from `src/styles.css` |
| `app.component.*` | Thin shell — composition and cross-feature orchestration only |

Bridge services (`*-bridge.service.ts`) remain thin preload wrappers.

## Phase 1 Target
Single-window Electron app with one real interactive terminal rendered through Angular and backed by node-pty.
