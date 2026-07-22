import {
  MAX_TERMINALS_PER_WORKSPACE,
  createTerminalDraft,
  getEffectiveLayoutMode,
  mapRuntimeTerminal,
  normalizeWorkspaceSnapshot,
} from './workspace-snapshot';

describe('workspace-snapshot', () => {
  it('migrates legacy multi-tab snapshots by keeping the active tab only', () => {
    const normalized = normalizeWorkspaceSnapshot(
      {
        layout: {
          mode: 'grid-2x2',
          activeTabId: 'tab-api',
          focusedPaneId: 'pane-1',
          panes: [
            { id: 'pane-1', tabId: 'tab-api' },
            { id: 'pane-2', tabId: 'tab-angular' },
            { id: 'pane-3', tabId: null },
            { id: 'pane-4', tabId: null },
          ],
        },
        tabs: [
          {
            id: 'tab-api',
            title: 'API',
            cwd: 'C:\\api',
            status: 'running',
            accent: 'violet',
          },
          {
            id: 'tab-angular',
            title: 'Angular',
            cwd: 'C:\\angular',
            status: 'running',
            accent: 'amber',
          },
        ],
      },
      'C:\\fallback'
    );

    expect(normalized.terminals.length).toBe(1);
    expect(normalized.terminals[0].id).toBe('terminal-1');
    expect(normalized.layout.focusedTerminalId).toBe('terminal-1');
  });

  it('creates an empty workspace when no terminals or tabs exist', () => {
    const normalized = normalizeWorkspaceSnapshot(undefined, 'C:\\Projects\\Demo');

    expect(normalized.terminals).toEqual([]);
    expect(normalized.layout.focusedTerminalId).toBe('');
  });

  it('enforces the workspace terminal limit constant', () => {
    expect(MAX_TERMINALS_PER_WORKSPACE).toBe(10);
  });

  it('keeps legacy layout mode helpers for snapshot compatibility', () => {
    expect(getEffectiveLayoutMode(0)).toBe('grid-2');
    expect(getEffectiveLayoutMode(1)).toBe('grid-2');
    expect(getEffectiveLayoutMode(2)).toBe('grid-2');
    expect(getEffectiveLayoutMode(3)).toBe('grid-2x2');
    expect(getEffectiveLayoutMode(4)).toBe('grid-2x2');
  });

  it('round-trips flat terminal color themes in snapshots', () => {
    const normalized = normalizeWorkspaceSnapshot(
      {
        layout: {
          mode: 'grid-2',
          focusedTerminalId: 'terminal-1',
        },
        terminals: [
          {
            id: 'terminal-1',
            name: 'API Server',
            cwd: 'C:\\api',
            status: 'idle',
            theme: { foreground: '#eeeeee', background: '#101010' },
          } as any,
        ],
      } as any,
      'C:\\fallback'
    );

    expect(normalized.terminals[0].theme).toEqual({
      foreground: '#eeeeee',
      background: '#101010',
    });
    expect(mapRuntimeTerminal(normalized.terminals[0]).theme).toEqual({
      foreground: '#eeeeee',
      background: '#101010',
    });
    expect(mapRuntimeTerminal(normalized.terminals[0]).name).toBe('API Server');
  });

  it('promotes the active tab terminals from a multi-tab migrated snapshot', () => {
    const normalized = normalizeWorkspaceSnapshot(
      {
        layout: {
          mode: 'grid-2x2',
          activeTabId: 'tab-angular',
          focusedTerminalId: 'terminal-2',
        },
        tabs: [
          {
            id: 'tab-api',
            title: 'API',
            cwd: 'C:\\api',
            accent: 'violet',
            terminals: [{ id: 'terminal-1', cwd: 'C:\\api', status: 'idle' }],
          },
          {
            id: 'tab-angular',
            title: 'Angular',
            cwd: 'C:\\angular',
            accent: 'amber',
            focusedTerminalId: 'terminal-2',
            terminals: [
              { id: 'terminal-2', cwd: 'C:\\angular', status: 'running' },
              { id: 'terminal-3', cwd: 'C:\\angular\\src', status: 'idle' },
            ],
          },
        ],
      } as any,
      'C:\\fallback'
    );

    expect(normalized.terminals.map((t) => t.id)).toEqual(['terminal-2', 'terminal-3']);
    expect(normalized.layout.focusedTerminalId).toBe('terminal-2');
  });

  it('builds terminal drafts with workspace cwd', () => {
    const draft = createTerminalDraft('C:\\work', { shell: 'powershell', existingCount: 1 });
    expect(draft.cwd).toBe('C:\\work');
    expect(draft.shell).toBe('powershell');
    expect(draft.status).toBe('idle');
  });
});
