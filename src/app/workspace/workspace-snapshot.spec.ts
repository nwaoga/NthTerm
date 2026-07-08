import { TestBed } from '@angular/core/testing';

import {
  MAX_TABS_PER_WORKSPACE,
  MAX_TERMINALS_PER_TAB,
  createEmptyTabSnapshot,
  mapRuntimeTerminal,
  normalizeWorkspaceSnapshot,
} from './workspace-snapshot';

describe('workspace-snapshot', () => {
  it('migrates legacy pane assignments into tab-owned terminals', () => {
    const normalized = normalizeWorkspaceSnapshot(
      {
        layout: {
          mode: 'grid-2x2',
          activeTabId: 'tab-api',
          focusedPaneId: 'pane-2',
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

    expect(normalized.tabs[0].terminals?.length).toBe(1);
    expect(normalized.tabs[0].terminals?.[0].id).toBe('terminal-1');
    expect(normalized.tabs[1].terminals?.[0].id).toBe('terminal-2');
    expect(normalized.layout.focusedTerminalId).toBe('terminal-2');
    expect(normalized.tabs[2]).toBeUndefined();
  });

  it('creates an empty starter tab when no tabs exist', () => {
    const normalized = normalizeWorkspaceSnapshot(undefined, 'C:\\Projects\\Demo');

    expect(normalized.tabs.length).toBe(1);
    expect(normalized.tabs[0].terminals).toEqual([]);
    expect(normalized.layout.activeTabId).toBe(normalized.tabs[0].id);
  });

  it('enforces workspace tab and terminal limits as constants', () => {
    expect(MAX_TABS_PER_WORKSPACE).toBe(5);
    expect(MAX_TERMINALS_PER_TAB).toBe(4);
    expect(createEmptyTabSnapshot('Main', 'C:\\').terminals).toEqual([]);
  });

  it('round-trips terminal color themes in snapshots', () => {
    const normalized = normalizeWorkspaceSnapshot(
      {
        tabs: [
          {
            id: 'tab-1',
            title: 'API',
            cwd: 'C:\\api',
            accent: 'violet',
            terminals: [
              {
                id: 'terminal-1',
                cwd: 'C:\\api',
                status: 'idle',
                theme: { foreground: '#eeeeee', background: '#101010' },
              } as any,
            ],
          },
        ],
      } as any,
      'C:\\fallback'
    );

    expect(normalized.tabs[0].terminals?.[0].theme).toEqual({
      foreground: '#eeeeee',
      background: '#101010',
    });
    expect(mapRuntimeTerminal(normalized.tabs[0].terminals![0]).theme).toEqual({
      foreground: '#eeeeee',
      background: '#101010',
    });
  });
});
