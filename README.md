# NthTerm

NthTerm is a cross-platform terminal workspace manager built with Angular, Electron, xterm.js, node-pty, and SQLite.

## Current status

Phase 1 is focused on a working desktop shell that opens Electron and renders a real interactive terminal.

## Development

Install dependencies:

```bash
npm install
```

Run the Angular renderer and Electron shell together:

```bash
npm start
```

Build the Angular app:

```bash
npm run build
```

Launch Electron against the built app:

```bash
npm run desktop
```

## Architecture direction

- Angular handles rendering and user interaction.
- Electron main owns PTY and process management.
- xterm.js provides the terminal UI.
- SQLite will back workspace persistence in later phases.
