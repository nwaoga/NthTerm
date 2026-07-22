# NthTerm Prompts

## Project Guardrails
- Treat the repository root as the source code folder.
- Keep planning and continuity docs in `ai/`.
- Keep PTY/process logic out of Angular components.
- Use Electron main process for PTY and process management.
- Use Angular for rendering and user interaction.
- Use SQLite for persistence.
- Treat workspace and terminal IDs as stable product identity; Electron PTY session IDs are runtime handles.
- Prefer workspace-owned terminals with splits; do not reintroduce a tab layer between workspace and terminal.
- Keep terminal startup single-flight in both renderer and Electron main.
- Prefer small incremental stories and commits.

## Current Prompt Focus
- Next session: ADO #138 (`npm run rc:verify` + RC tag), #139 (macOS `release:mac` smoke), then #140 (stacked layout polish).
- Preserve the compact inspector hierarchy (Workspace | Terminal) and stacked focus/overview layout.
- Renderer refactor is complete; keep new code in feature folders/services and do not grow god files.

## Handoff Summary
- Product name: NthTerm
- Themes: Midnight, Coffee, and White app chrome, with separate terminal color themes and ANSI palettes
- Current milestone: `0.1.0-rc.1` post-verification polish complete; stacked/glass/macOS batch shipped; final RC verification/publication remains (#138)
- Renderer: feature-oriented Angular shell with workspace-owned stable terminals, stacked focus/overview, compact inspector projections, and utility command history attributed by terminal ID
- Electron: frameless window with Windows acrylic / macOS vibrancy chrome, queued Windows PTY lifecycle, stable-terminal start deduplication, platform-aware shells, and SQLite persistence
- Latest source verification: Electron checks + 139 Angular specs; build passes with the accepted xterm bundle-budget warning
- Stopped for the night with docs/ADO backlog updated for #138–#140
