# NthTerm Migration Summary

Date: 2026-09-16

This branch contains the start of an Angular 22 and state modernization pass.

## Current State

- The dependency graph targets Angular 22 with TypeScript 6.0.3.
- `WorkspaceRuntimeService` uses Angular signals internally for workspace, terminal, shell profile, and recovery state.
- Existing components still consume `WorkspaceRuntimeService` through the same property and method API they used before the migration.
- Shell theme surface tokens have been changed toward solid, opaque backgrounds.

## Validation Checklist

- `npm run build`
- `npm run test:ci`
- Manual launch with `npm start`

## Follow-Up Work

- Convert component consumers to direct signal reads only where it reduces complexity.
- Update design documentation if opaque surfaces replace the previous frosted glass direction.
- Remove this note once the migration has a permanent changelog or architecture entry.
