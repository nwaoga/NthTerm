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
