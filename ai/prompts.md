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
- **Milestone complete:** `0.1.0-rc.2` is tagged, verified, and published. Landing-page download links resolve.
- Landing page uses real Focus/Overview product shots from `site/media/` (Angular reference preview — Studio Stack demo); feature triad still uses CSS mini-mocks.
- #138/#139/#140/#141/#156 Closed (ADO + repo). PR #1 and cloud setup PR #2 merged to `main`. Post-RC2 chrome: rails/dock start collapsed (`51f04c9`).
- Public RC page: `https://nwaoga.github.io/NthTerm/` (`site/` via GitHub Pages — static marketing only, not the Angular app).
- Release: https://github.com/nwaoga/NthTerm/releases/tag/v0.1.0-rc.2 (unsigned Win + macOS assets).
- **Deferred:** Authenticode / Apple notarization / `electron-updater` until certificates exist.
- Preserve the compact inspector hierarchy (Workspace | Terminal) and stacked focus/overview layout.
- Renderer refactor is complete; keep new code in feature folders/services and do not grow god files.
- `output/` is gitignored; do not force-add capture junk.

## Handoff Summary
- Product name: NthTerm
- Themes: Midnight, Coffee, and White app chrome, with separate terminal color themes and ANSI palettes
- Current milestone: `0.1.0-rc.2` published; Windows verify passed; macOS packaged smoke green on CI; GitHub Release live
- Public site: `https://nwaoga.github.io/NthTerm/` — GitHub Pages from `site/` (`media/focus.png`, `media/overview.png`); workflow `.github/workflows/pages.yml`
- Backlog: signing / notarization / auto-update only (no open RC publish items)
- Mac smoke evidence: `docs/verification/macos-smoke-v0.1.0-rc.2.json` from Actions run `31277571206`
- Local verify bar: `npm run build` + `npm run test:ci` (45 Electron / 152 Angular)
- Renderer: feature-oriented Angular shell with workspace-owned stable terminals, stacked focus/overview, compact inspector projections, and utility command history attributed by terminal ID
- Electron: frameless window with Windows acrylic / macOS vibrancy chrome, queued Windows PTY lifecycle, stable-terminal start deduplication, platform-aware shells, and SQLite persistence
- Upgrade policy for now: install newer build over existing install; AppData / Application Support preserved. `electron-updater` after code signing.
