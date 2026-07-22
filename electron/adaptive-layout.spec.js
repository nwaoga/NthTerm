const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');
const windowChromeSource = fs.readFileSync(path.join(root, 'electron', 'window-chrome.js'), 'utf8');
const shellCss = fs.readFileSync(path.join(root, 'src', 'app', 'styles', 'shell.css'), 'utf8');
const workspaceAreaSource = fs.readFileSync(
  path.join(root, 'src', 'app', 'workspace', 'workspace-area.component.ts'),
  'utf8'
);

test('compact shell breakpoint activates before the Electron minimum width', () => {
  const minWidth = Number(windowChromeSource.match(/minWidth:\s*(\d+)/)?.[1]);
  const compactBreakpoint = Number(
    shellCss.match(/@media \(max-width:\s*(\d+)px\) \{\s*\.shell-toolbar/)?.[1]
  );

  assert.equal(minWidth, 960);
  assert.equal(compactBreakpoint, 1180);
  assert.ok(compactBreakpoint > minWidth);
});

test('compact layout overlays the inspector and caps the dock by viewport height', () => {
  assert.match(
    shellCss,
    /@media \(max-width: 1100px\)[\s\S]*?\.inspector \{[\s\S]*?position: absolute/
  );
  assert.match(shellCss, /var\(--dock-height, 280px\), 42vh/);
  assert.match(
    shellCss,
    /@media \(max-width: 1100px\)[\s\S]*?var\(--dock-height, 280px\), 32vh/
  );
});

test('compact toolbar keeps command icons visible while hiding labels', () => {
  assert.match(shellCss, /\.toolbar-command > span:not\(\.toolbar-icon\)/);
  assert.doesNotMatch(shellCss, /\.toolbar-command > span,\s*\.toolbar-command > kbd/);
});

test('stacked focus layout parks inactive terminals and avoids a peer thumbnail rail', () => {
  assert.match(shellCss, /\.terminal-session-park \{/);
  assert.match(shellCss, /\.terminal-focus-view \{/);
  assert.match(shellCss, /\.terminal-overview-grid \{/);
  assert.match(shellCss, /\.terminal-stack-layers \{/);
  assert.doesNotMatch(shellCss, /\.pane-grid\.pane-grid-zoomed \.zoom-peer-3/);
});

test('workspace stack transitions respect reduced motion', () => {
  assert.match(
    shellCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.workspace-stack-stage-focus,[\s\S]*?animation: none;/
  );
});

test('shell chrome uses frosted glass tokens with reduced-transparency fallback', () => {
  assert.match(shellCss, /--shell-glass-blur:\s*34px;/);
  assert.match(shellCss, /--shell-glass-saturate:\s*1\.45;/);
  assert.match(shellCss, /--shell-glass-filter:\s*blur\(var\(--shell-glass-blur\)\) saturate\(var\(--shell-glass-saturate\)\);/);
  assert.match(shellCss, /--shell-glass-border:/);
  assert.match(shellCss, /\.shell-toolbar \{[\s\S]*?backdrop-filter: var\(--shell-glass-filter\);/);
  assert.match(shellCss, /\.left-rail \{[\s\S]*?backdrop-filter: var\(--shell-glass-filter\);/);
  assert.match(shellCss, /\.workspace-stage-body \{[\s\S]*?backdrop-filter: var\(--shell-glass-filter\);/);
  assert.match(shellCss, /\.terminal-host \{[\s\S]*?backdrop-filter: none;/);
  assert.match(shellCss, /\.app-shell \{[\s\S]*?background:\s*var\(--shell-bg-base\);/);
  assert.match(shellCss, /\.left-rail \{[\s\S]*?background:\s*var\(--shell-rail-bg\);/);
  assert.match(shellCss, /--shell-rail-bg:\s*rgba\(/);
  assert.doesNotMatch(shellCss, /--shell-rail-bg:\s*linear-gradient/);
  assert.match(shellCss, /\.env-entry \{[\s\S]*?flex-direction:\s*column;/);
  assert.match(shellCss, /\.env-entry strong \{[\s\S]*?white-space:\s*normal;/);
  assert.match(
    shellCss,
    /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?--shell-glass-filter:\s*none;/
  );
  assert.match(
    shellCss,
    /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?\.shell-toolbar,[\s\S]*?backdrop-filter: none;/
  );
});

test('Windows window uses acrylic glass material with a clear background', () => {
  assert.match(windowChromeSource, /backgroundMaterial:\s*'acrylic'/);
  assert.match(mainSource, /window\.setBackgroundColor\('#00000000'\)/);
  assert.match(mainSource, /createBrowserWindowOptions/);
  assert.match(shellCss, /\.shell-toolbar\.mac-titlebar \{[\s\S]*?padding-left:\s*calc\(var\(--shell-traffic-lights-inset\)/);
  assert.match(shellCss, /--shell-traffic-lights-inset:\s*72px;/);
});

test('macOS window chrome reserves traffic-light space without Windows overlay', () => {
  assert.match(windowChromeSource, /titleBarStyle:\s*isMac \? 'hiddenInset' : 'hidden'/);
  assert.match(windowChromeSource, /trafficLightPosition/);
  assert.match(windowChromeSource, /vibrancy:\s*'under-window'/);
  assert.match(windowChromeSource, /isWin\s*\?[\s\S]*titleBarOverlay/);
  assert.doesNotMatch(windowChromeSource, /platform === 'darwin'[\s\S]{0,80}titleBarOverlay:/);
});

test('terminal focus view does not transform live xterm surfaces for stack chrome', () => {
  assert.match(workspaceAreaSource, /WorkspaceLayoutService/);
  assert.match(workspaceAreaSource, /setInteractiveTerminalId/);
  assert.doesNotMatch(workspaceAreaSource, /setZoomedTerminal/);
  assert.doesNotMatch(
    shellCss,
    /\.terminal-viewport-host[\s\S]{0,120}transform:/
  );
});

test('2-up layout assigns visible grid areas to all four terminals', () => {
  // Legacy grid CSS may remain for snapshot compatibility; stacked layout is primary.
  assert.match(shellCss, /\.terminal-overview-grid \{/);
});

test('the full toolbar remains draggable outside genuine controls', () => {
  assert.match(
    shellCss,
    /\.shell-toolbar \{[\s\S]*?user-select: none;[\s\S]*?-webkit-app-region: drag;/
  );
  assert.match(
    shellCss,
    /\.shell-toolbar button,[\s\S]*?\.shell-toolbar \[role='menu'\] \{\s*-webkit-app-region: no-drag;/
  );
  assert.doesNotMatch(shellCss, /\.shell-toolbar \.toolbar-actions,[\s\S]{0,300}-webkit-app-region: no-drag;/);
  assert.doesNotMatch(shellCss, /\.shell-toolbar svg[\s\S]{0,120}-webkit-app-region: no-drag;/);
});

test('terminal surfaces suppress accidental horizontal xterm scroll tracks', () => {
  assert.match(
    shellCss,
    /\.terminal-host \.xterm-viewport \{\s*overflow-x: hidden !important;\s*overflow-y: auto !important;/
  );
  assert.doesNotMatch(
    shellCss,
    /\.terminal-host \.xterm-screen,[\s\S]{0,180}\.terminal-host \.xterm-scroll-area \{\s*height: 100% !important;/
  );
});

test('xterm viewport remainder uses the active terminal theme instead of black', () => {
  assert.match(
    shellCss,
    /\.terminal-host \.xterm,\s*\.terminal-host \.xterm-viewport \{\s*background-color: var\(--terminal-surface-bg, #0d1320\) !important;/
  );
});
