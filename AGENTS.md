# NthTerm Agent Rules

## Testing Is Required

- Every new feature or behavior change must add or update unit tests in the same task.
- Do not treat visual-only UI work as exempt. If behavior, emitted events, state mapping, or rendering logic changes, add or update specs.
- Before marking work complete, run:
  - `npm run build`
  - `npm run test:ci`

## Angular Test Conventions

- Prefer focused Jasmine/Karma specs close to the feature under `src/app/**`.
- Mock bridge services and heavy runtime dependencies instead of invoking Electron, PTYs, or external processes in unit tests.
- For standalone components, test emitted outputs and user-triggered behavior through the component fixture when practical.
- For services, test state transitions and returned projections rather than implementation details.

## Minimum Feature Bar

- New component behavior: add or update component specs.
- New service logic: add or update service specs.
- New workspace/runtime branching logic: add regression coverage for the affected path.
- Bug fix: add a spec that would have caught the bug when practical.

## Cursor Cloud specific instructions

NthTerm is a single Electron + Angular desktop app (renderer served by Angular, PTY/SQLite owned by Electron main). There is one product to run; there are no separate backend services.

- Build/test/run commands are already documented in `README.md` and `package.json` scripts. Standard flow: `npm run build`, `npm run test:ci`, and `npm start` (which runs `npm run serve` + `npm run electron:dev` via `concurrently`).
- The cloud VM is headless-with-Xvfb: a display is available at `DISPLAY=:1`. Electron must have `DISPLAY` set to render. `npm start`/`npm run electron:dev` inherit the shell env, so ensure `DISPLAY=:1` is exported. To run the two halves manually: start `npm run serve` (Angular at `http://127.0.0.1:4200`), then `DISPLAY=:1 NTH_TERM_RENDERER_URL=http://127.0.0.1:4200 npx electron .`.
- The Angular renderer depends on the Electron preload bridge (`window.nthTermDesktop`). Opening `http://127.0.0.1:4200` in a plain browser throws "Electron ... bridge is not available." — the UI only works inside the Electron window.
- Karma tests run headless via `ChromeHeadless`. Chrome is on `PATH` as `google-chrome`, so `karma-chrome-launcher` auto-detects it and `CHROME_BIN` does not need to be set.
- When Electron launches, `dbus` connection errors and `WebGL1 blocklisted` messages are non-fatal in this environment and can be ignored. A shell `nvm ... npm_config_prefix` warning may also print inside spawned terminals; it is harmless.
- `node-pty` is a native module built during install; it loads fine on Linux. `postinstall` runs `electron/patch-node-pty-windows.js`, which is a no-op off Windows.
