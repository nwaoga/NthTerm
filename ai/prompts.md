# NthTerm Prompts

## Project Guardrails
- Treat `repo` as the source code folder.
- Keep planning and continuity docs in `ai`.
- Keep PTY/process logic out of Angular components.
- Use Electron main process for PTY and process management.
- Use Angular for rendering and user interaction.
- Use SQLite for persistence.
- Prefer small incremental stories and commits.

## Current Prompt Focus
- Phase 4: session history, concurrent multi-pane PTY, and design-alignment polish against `docs/target-ui-reference.png`.
- Renderer refactor is complete — keep new code in feature folders/services; do not grow god files.

## Handoff Summary
- Product name: NthTerm
- Theme direction: one clean dark theme to start
- Current milestone: Phase 4 — session history, management, and design fidelity
- Renderer: feature-oriented Angular shell (`models/`, `workspace/`, `terminal/`, feature components, `styles/shell.css`)
- Electron: frameless window with custom drag regions; PTY/persistence remain in main process
