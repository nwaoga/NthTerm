# NthTerm Agent Instructions

## Unit Tests Are Required

- Every new feature or behavior change must add or update unit tests in the same task.
- UI polish work is not automatically exempt. If logic, emitted events, state mapping, or conditional rendering changes, add or update specs.
- Bug fixes should include a regression test when practical.

## Expected Validation

- Run `npm run build`
- Run `npm run test:ci`

## Angular Testing Guidance

- Put specs close to the feature under `src/app/**`.
- Mock Electron bridges, PTY services, and other heavy runtime dependencies in unit tests.
- Prefer focused tests for component outputs, service state transitions, and restore/workspace branching logic.

## Source Of Truth

- Keep this file aligned with `AGENTS.md` so human handoff notes and agent-enforced rules do not drift.
