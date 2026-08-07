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
- Next: #139 (macOS smoke — needs a Mac), then #140 (stacked focus/overview polish). Prefer #140 first if Windows-only.
- Landing page (#141) is live at `https://nwaoga.github.io/NthTerm/` from `site/` via GitHub Pages (static marketing page only — not the Angular app).
- `v0.1.0-rc.2` is tagged; CI publishes unsigned Windows + macOS artifacts. Signing/notarization deferred.
- Preserve the compact inspector hierarchy (Workspace | Terminal) and stacked focus/overview layout.
- Renderer refactor is complete; keep new code in feature folders/services and do not grow god files.
- Ignore untracked `output/` chrome-capture junk; do not commit it.

## Handoff Summary
- Product name: NthTerm
- Themes: Midnight, Coffee, and White app chrome, with separate terminal color themes and ANSI palettes
- Current milestone: `0.1.0-rc.2` tagged (`v0.1.0-rc.2`); Windows verify passed; public RC page shipped (#141 Closed)
- Public site: `https://nwaoga.github.io/NthTerm/` — GitHub Pages from `site/`; workflow `.github/workflows/pages.yml`
- Backlog: #139 macOS smoke, #140 stacked UX polish; no domain purchase planned for RC
- Renderer: feature-oriented Angular shell with workspace-owned stable terminals, stacked focus/overview, compact inspector projections, and utility command history attributed by terminal ID
- Electron: frameless window with Windows acrylic / macOS vibrancy chrome, queued Windows PTY lifecycle, stable-terminal start deduplication, platform-aware shells, and SQLite persistence
- Upgrade policy for now: install newer build over existing install; AppData / Application Support preserved. `electron-updater` after code signing.
