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
- **Next:** merge PR #1, then dispatch **Publish GitHub Release** (`v0.1.0-rc.2` / run `30753822270`) so landing-page download links resolve.
- Close ADO #139 in Azure DevOps when convenient (repo smoke evidence is already green).
- #139/#140/#141 Closed in repo; #138 RC2 tagged earlier.
- Landing page live at `https://nwaoga.github.io/NthTerm/` from `site/` via GitHub Pages (static marketing page only — not the Angular app).
- `v0.1.0-rc.2` tagged; CI uploads unsigned Win/mac artifacts, runs `smoke:mac` on macOS jobs, and (on `v*` tags) publishes a GitHub Release. Signing/notarization deferred.
- Preserve the compact inspector hierarchy (Workspace | Terminal) and stacked focus/overview layout.
- Renderer refactor is complete; keep new code in feature folders/services and do not grow god files.
- Ignore untracked `output/` chrome-capture junk; do not commit it.

## Handoff Summary
- Product name: NthTerm
- Themes: Midnight, Coffee, and White app chrome, with separate terminal color themes and ANSI palettes
- Current milestone: `0.1.0-rc.2` tagged; Windows verify passed; macOS packaged smoke green on CI
- Open PR: https://github.com/nwaoga/NthTerm/pull/1 (`cursor/publish-rc-github-release-8c48`) — release publish + #139 smoke automation
- Public site: `https://nwaoga.github.io/NthTerm/` — GitHub Pages from `site/`; workflow `.github/workflows/pages.yml`
- Backlog: merge PR → publish Release assets for `v0.1.0-rc.2` → close ADO #139 (signing deferred)
- Mac smoke evidence: `docs/verification/macos-smoke-v0.1.0-rc.2.json` from Actions run `31277571206`
- Local verify bar: `npm run build` + `npm run test:ci` (45 Electron / 144 Angular)
- Renderer: feature-oriented Angular shell with workspace-owned stable terminals, stacked focus/overview, compact inspector projections, and utility command history attributed by terminal ID
- Electron: frameless window with Windows acrylic / macOS vibrancy chrome, queued Windows PTY lifecycle, stable-terminal start deduplication, platform-aware shells, and SQLite persistence
- Upgrade policy for now: install newer build over existing install; AppData / Application Support preserved. `electron-updater` after code signing.
