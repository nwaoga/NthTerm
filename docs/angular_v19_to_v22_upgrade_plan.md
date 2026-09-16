# Angular 19 to 22 Migration Notes

Date: 2026-09-16

NthTerm has been moved onto the Angular 22 package line in `package.json` and `package-lock.json`.
The migration is intentionally conservative in application code: existing components continue to use the
same `WorkspaceRuntimeService` API, while the runtime service now stores its mutable workspace state in
Angular signals behind property accessors.

## Completed

- Aligned Angular runtime, CLI, compiler, and TypeScript versions for Angular 22.
- Restored a clean compile after the initial partial signals conversion broke consumers.
- Signal-backed the workspace runtime state without forcing a broad component rewrite.
- Kept the app's public service contract stable for terminal, workspace, inspector, and command-palette code.
- Reworked shell surface tokens toward opaque backgrounds without leaving generated-looking comments in CSS.

## Still Required

- Run the full project validation suite before merging: `npm run build` and `npm run test:ci`.
- Review Angular 22 deprecation warnings from the Webpack dev-server path.
- Decide whether the opaque surface styling is the desired product direction, since the README still describes frosted glass chrome.
- Avoid claiming the component tree has been fully migrated to direct signal reads until each consumer is intentionally converted and tested.
