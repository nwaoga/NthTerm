import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from './workspace-runtime.service';
import { SavedWorkspace, WorkspaceBridgeService } from '../workspace-bridge.service';
import { RuntimeTerminal } from '../models';
import { MAX_TERMINALS_PER_WORKSPACE } from './workspace-snapshot';

function makeTerminal(overrides: Partial<RuntimeTerminal> & { id: string }): RuntimeTerminal {
  return {
    name: '',
    cwd: 'C:\\Projects\\Demo',
    shell: '',
    startupCommand: '',
    status: 'idle',
    session: null,
    theme: null,
    ...overrides,
  };
}

function makeWorkspace(overrides: Partial<SavedWorkspace> = {}): SavedWorkspace {
  return {
    id: 'ws-1',
    name: 'Demo',
    cwd: 'C:\\Projects\\Demo',
    shell: '',
    templateId: 'empty-workspace',
    icon: 'cloud',
    accent: 'violet',
    layoutMode: 'grid-2',
    launchProfile: 'manual',
    updatedAt: '2026-07-02T00:00:00.000Z',
    sessionSnapshot: {
      layout: {
        mode: 'grid-2',
        focusedTerminalId: '',
        colSplit: 50,
        rowSplit: 50,
      },
      terminals: [],
    },
    ...overrides,
  };
}

describe('WorkspaceRuntimeService', () => {
  let service: WorkspaceRuntimeService;
  let workspaceBridge: {
    listWorkspaces: jasmine.Spy;
    saveWorkspace: jasmine.Spy;
    createWorkspace: jasmine.Spy;
    setActiveWorkspace: jasmine.Spy;
  };

  beforeEach(() => {
    workspaceBridge = {
      listWorkspaces: jasmine.createSpy('listWorkspaces').and.resolveTo([]),
      saveWorkspace: jasmine.createSpy('saveWorkspace').and.callFake(async (draft: any) =>
        makeWorkspace({
          ...draft,
          id: draft.id || 'ws-1',
          updatedAt: '2026-07-02T00:00:00.000Z',
          sessionSnapshot: draft.sessionSnapshot,
        })
      ),
      createWorkspace: jasmine.createSpy('createWorkspace').and.callFake(async (draft: any) =>
        makeWorkspace({
          id: 'ws-created',
          shell: '',
          templateId: draft.templateId || 'empty-workspace',
          icon: draft.icon || 'cloud',
          accent: draft.accent || 'slate',
          layoutMode: draft.layoutMode || 'grid-2',
          launchProfile: draft.launchProfile || 'manual',
          sessionSnapshot: draft.sessionSnapshot,
          updatedAt: '2026-07-02T00:00:00.000Z',
          ...draft,
        })
      ),
      setActiveWorkspace: jasmine.createSpy('setActiveWorkspace').and.resolveTo(
        makeWorkspace({
          id: 'ws-2',
          name: 'Workspace 2',
          cwd: 'C:\\Projects\\Two',
          accent: 'violet',
          sessionSnapshot: {
            layout: {
              mode: 'grid-2',
              focusedTerminalId: 'terminal-1',
              colSplit: 50,
              rowSplit: 50,
            },
            terminals: [
              {
                id: 'terminal-1',
                cwd: 'C:\\Projects\\Two',
                shell: '',
                startupCommand: '',
                status: 'running',
              },
            ],
          },
        })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: WorkspaceBridgeService,
          useValue: workspaceBridge,
        },
      ],
    });
    service = TestBed.inject(WorkspaceRuntimeService);
  });

  it('builds unique workspace names from existing workspaces', () => {
    service.workspaces = [
      { id: '1', name: 'Angular App', icon: 'spark', accent: 'amber' },
      { id: '2', name: 'Angular App 2', icon: 'spark', accent: 'amber' },
    ];

    expect(service.buildWorkspaceName('Angular App')).toBe('Angular App 3');
  });

  it('creates and adds terminals and derives arrangement from count', () => {
    service.activeWorkspace = makeWorkspace();
    service.selectedWorkspaceId = 'ws-1';
    service.workingDirectory = 'C:\\Projects\\Demo';

    const draft = service.createTerminalDraft('powershell');
    expect(draft).not.toBeNull();
    expect(draft).not.toBe('blocked');
    if (!draft || draft === 'blocked') {
      return;
    }

    expect(draft.shell).toBe('powershell');
    expect(draft.cwd).toBe('C:\\Projects\\Demo');
    expect(draft.status).toBe('idle');

    service.addTerminal(draft);
    expect(service.terminals.length).toBe(1);
    expect(service.focusedTerminalId).toBe(draft.id);
    expect(service.workspaceSummary.paneCount).toBe(1);
    expect(service.workspaceSummary.layoutMode).toBe('grid-2');
    expect(service.getActiveLayoutLabel()).toBe('Full stage');

    service.addTerminal(makeTerminal({ id: 'terminal-2', shell: 'cmd' }));
    expect(service.workspaceSummary.paneCount).toBe(2);
    expect(service.getEffectiveActiveLayoutMode()).toBe('grid-2');
    expect(service.getActiveLayoutLabel()).toBe('Side by side');

    service.addTerminal(makeTerminal({ id: 'terminal-3' }));
    expect(service.getEffectiveActiveLayoutMode()).toBe('grid-2x2');
    expect(service.getActiveLayoutLabel()).toBe('Wide lower pane');

    service.addTerminal(makeTerminal({ id: 'terminal-4' }));
    expect(service.workspaceSummary.paneCount).toBe(4);
    expect(service.getActiveLayoutLabel()).toBe('Four-pane grid');
  });

  it('blocks createTerminalDraft and duplicateTerminal at the workspace limit', async () => {
    service.activeWorkspace = makeWorkspace();
    service.selectedWorkspaceId = 'ws-1';
    service.terminals = Array.from({ length: MAX_TERMINALS_PER_WORKSPACE }, (_, index) =>
      makeTerminal({
        id: `terminal-${index}`,
        name: index === 0 ? 'API Server' : '',
        shell: 'powershell',
        startupCommand: index === 0 ? 'dotnet run' : '',
        status: 'running',
      })
    );
    service.focusedTerminalId = 'terminal-0';

    expect(service.createTerminalDraft()).toBe('blocked');
    expect(await service.duplicateTerminal('terminal-0')).toBe('blocked');
    expect(service.terminals.length).toBe(MAX_TERMINALS_PER_WORKSPACE);
  });

  it('duplicates a terminal under the limit and copies name and startup command', async () => {
    service.activeWorkspace = makeWorkspace();
    service.selectedWorkspaceId = 'ws-1';
    service.terminals = [
      makeTerminal({
        id: 'terminal-1',
        name: 'API Server',
        shell: 'powershell',
        startupCommand: 'dotnet run',
        status: 'running',
      }),
    ];
    service.focusedTerminalId = 'terminal-1';

    const duplicate = await service.duplicateTerminal('terminal-1');
    expect(duplicate).not.toBeNull();
    expect(duplicate).not.toBe('blocked');
    if (!duplicate || duplicate === 'blocked') {
      return;
    }

    expect(duplicate.startupCommand).toBe('dotnet run');
    expect(duplicate.name).toBe('API Server copy');
    expect(service.terminals.length).toBe(2);
    expect(workspaceBridge.saveWorkspace).toHaveBeenCalled();
  });

  it('removes, focuses, and cycles terminals', async () => {
    service.activeWorkspace = makeWorkspace();
    service.selectedWorkspaceId = 'ws-1';
    service.terminals = [
      makeTerminal({ id: 'terminal-1', cwd: 'C:\\A', status: 'running' }),
      makeTerminal({ id: 'terminal-2', cwd: 'C:\\B', status: 'running' }),
      makeTerminal({ id: 'terminal-3', cwd: 'C:\\C', status: 'idle' }),
    ];
    service.focusedTerminalId = 'terminal-1';
    service.workingDirectory = 'C:\\A';

    expect(await service.focusTerminal('terminal-2')).toEqual(
      jasmine.objectContaining({ id: 'terminal-2' })
    );
    expect(service.focusedTerminalId).toBe('terminal-2');
    expect(service.workingDirectory).toBe('C:\\B');
    expect(await service.focusTerminal('terminal-2')).toBe('unchanged');

    expect((await service.cycleTerminal(1)) as RuntimeTerminal).toEqual(
      jasmine.objectContaining({ id: 'terminal-3' })
    );
    expect((await service.cycleTerminal(-1)) as RuntimeTerminal).toEqual(
      jasmine.objectContaining({ id: 'terminal-2' })
    );

    const removed = await service.removeTerminal('terminal-2');
    expect(removed).toEqual(jasmine.objectContaining({ id: 'terminal-1' }));
    expect(service.terminals.map((terminal) => terminal.id)).toEqual(['terminal-1', 'terminal-3']);
    expect(service.focusedTerminalId).toBe('terminal-1');
    expect(service.workspaceSummary.paneCount).toBe(2);
  });

  it('applyWorkspace loads flat terminals and migrates multi-tab snapshots to active-tab terminals only', () => {
    service.applyWorkspace(
      makeWorkspace({
        shell: 'cmd',
        sessionSnapshot: {
          layout: {
            mode: 'grid-2',
            focusedTerminalId: 'terminal-1',
            colSplit: 55,
            rowSplit: 45,
          },
          terminals: [
            {
              id: 'terminal-1',
              name: 'API',
              cwd: 'C:\\Projects\\Demo\\Api',
              shell: 'powershell',
              startupCommand: 'dotnet run',
              status: 'running',
            },
            {
              id: 'terminal-2',
              cwd: 'C:\\Projects\\Demo\\Web',
              shell: 'cmd',
              startupCommand: '',
              status: 'idle',
            },
          ],
        },
      })
    );

    expect(service.terminals.length).toBe(2);
    expect(service.focusedTerminalId).toBe('terminal-1');
    expect(service.paneColSplit).toBe(55);
    expect(service.paneRowSplit).toBe(45);
    expect(service.workingDirectory).toBe('C:\\Projects\\Demo\\Api');
    expect(service.workspaceSummary.paneCount).toBe(2);
    expect(service.workspaceSummary.layoutMode).toBe('grid-2');
    expect((service.workspaceSummary as { tabCount?: number }).tabCount).toBeUndefined();

    service.applyWorkspace(
      makeWorkspace({
        sessionSnapshot: {
          layout: {
            mode: 'grid-2x2',
            activeTabId: 'tab-2',
            focusedTerminalId: 'terminal-b',
            panes: [],
          },
          tabs: [
            {
              id: 'tab-1',
              title: 'Ignored',
              cwd: 'C:\\Ignored',
              accent: 'slate',
              layoutMode: 'grid-2',
              terminals: [
                {
                  id: 'terminal-a',
                  cwd: 'C:\\Ignored',
                  shell: '',
                  startupCommand: '',
                  status: 'idle',
                },
              ],
            },
            {
              id: 'tab-2',
              title: 'Active',
              cwd: 'C:\\Active',
              accent: 'violet',
              layoutMode: 'grid-2',
              colSplit: 60,
              rowSplit: 40,
              focusedTerminalId: 'terminal-b',
              terminals: [
                {
                  id: 'terminal-b',
                  name: 'Backend',
                  cwd: 'C:\\Active',
                  shell: 'powershell',
                  startupCommand: '',
                  status: 'running',
                },
                {
                  id: 'terminal-c',
                  cwd: 'C:\\Active\\Web',
                  shell: 'cmd',
                  startupCommand: '',
                  status: 'idle',
                },
              ],
            },
          ],
        },
      })
    );

    expect(service.terminals.map((terminal) => terminal.id)).toEqual(['terminal-b', 'terminal-c']);
    expect(service.focusedTerminalId).toBe('terminal-b');
    expect(service.paneColSplit).toBe(60);
    expect(service.paneRowSplit).toBe(40);
    expect(service.workspaceSummary.paneCount).toBe(2);
  });

  it('applies and resolves per-workspace shell profiles for new terminals', () => {
    service.applyWorkspace(
      makeWorkspace({
        shell: 'cmd',
        sessionSnapshot: {
          layout: { mode: 'grid-2', focusedTerminalId: '', colSplit: 50, rowSplit: 50 },
          terminals: [],
        },
      })
    );

    expect(service.workspaceShellProfile).toBe('cmd');
    expect(service.getWorkspaceShellProfileLabel()).toBe('Command Prompt');
    expect(service.resolveNewTerminalShell(undefined, 'powershell')).toBe('cmd');
    expect(service.resolveNewTerminalShell('bash', 'powershell')).toBe('bash');

    service.workspaceShellProfile = 'system';
    expect(service.resolveNewTerminalShell(undefined, 'powershell')).toBe('');
  });

  it('adds WSL distros to shell options and resolves WSL profiles', () => {
    const previousDesktop = window.nthTermDesktop;
    window.nthTermDesktop = { ...(previousDesktop || {}), platform: 'win32' };

    try {
      service.setWslDistros(['Ubuntu', 'Debian', 'Ubuntu']);
      service.workspaceShellProfile = 'wsl:Ubuntu';

      expect(service.getShellOptions().map((option) => option.value)).toContain('wsl:Ubuntu');
      expect(service.getWorkspaceShellProfileOptions().map((option) => option.label)).toContain(
        'WSL: Debian'
      );
      expect(service.getWorkspaceShellProfileLabel()).toBe('WSL: Ubuntu');
      expect(service.resolveNewTerminalShell(undefined, 'powershell')).toBe('wsl:Ubuntu');
    } finally {
      if (previousDesktop) {
        window.nthTermDesktop = previousDesktop;
      } else {
        delete window.nthTermDesktop;
      }
    }
  });

  it('hides Windows-only shell choices on macOS while keeping labels for persisted shells', () => {
    const previousDesktop = window.nthTermDesktop;
    window.nthTermDesktop = { ...(previousDesktop || {}), platform: 'darwin' };

    try {
      service.setWslDistros(['Ubuntu']);
      service.workspaceShellProfile = 'cmd';
      service.terminals = [
        makeTerminal({ id: 'terminal-1', shell: 'powershell', status: 'running' }),
        makeTerminal({ id: 'terminal-2', shell: 'wsl:Ubuntu', status: 'running' }),
      ];

      const optionValues = service.getShellOptions().map((option) => option.value);
      expect(optionValues).toEqual(['', 'bash', 'zsh']);
      expect(service.getWorkspaceShellProfileLabel()).toBe('Command Prompt');
      expect(service.getTerminalDisplayTitle(service.terminals[0], 0)).toBe('PowerShell');
      expect(service.getTerminalDisplayTitle(service.terminals[1], 1)).toBe('WSL: Ubuntu');
    } finally {
      if (previousDesktop) {
        window.nthTermDesktop = previousDesktop;
      } else {
        delete window.nthTermDesktop;
      }
    }
  });

  it('names terminals by shell and only numbers duplicate shells', () => {
    service.setWslDistros(['Ubuntu']);
    service.terminals = [
      makeTerminal({ id: 'terminal-1', shell: 'powershell', status: 'running' }),
      makeTerminal({ id: 'terminal-2', shell: 'powershell', status: 'running' }),
      makeTerminal({ id: 'terminal-3', shell: 'wsl:Ubuntu', status: 'running' }),
    ];

    expect(service.getTerminalDisplayTitle(service.terminals[0], 0)).toBe('PowerShell 1');
    expect(service.getTerminalDisplayTitle(service.terminals[1], 1)).toBe('PowerShell 2');
    expect(service.getTerminalDisplayTitle(service.terminals[2], 2)).toBe('WSL: Ubuntu');
  });

  it('resolves command history through stable terminal ids after renaming', () => {
    service.workspaceName = 'Main';
    service.focusedTerminalId = 'terminal-1';
    service.terminals = [
      makeTerminal({
        id: 'terminal-1',
        name: 'API',
        shell: 'powershell',
        status: 'running',
      }),
    ];
    const entry = {
      id: 'cmd-1',
      command: 'dotnet run',
      timestamp: new Date().toISOString(),
      tabTitle: 'Main',
      tabId: 'tab-1',
      terminalId: 'terminal-1',
      terminalTitle: 'API',
    };

    expect(service.getCommandHistorySource(entry)).toBe('Main • API');
    service.updateFocusedTerminalName('Backend');
    expect(service.getCommandHistorySource(entry)).toBe('Main • Backend');
  });

  it('updates a terminal name by id without requiring focus', () => {
    service.terminals = [
      makeTerminal({ id: 'terminal-1', name: '', shell: 'powershell', status: 'idle' }),
      makeTerminal({ id: 'terminal-2', name: '', shell: 'powershell', status: 'idle' }),
    ];
    service.focusedTerminalId = 'terminal-1';

    service.updateTerminalName('terminal-2', 'Workers');

    expect(service.terminals[1].name).toBe('Workers');
    expect(service.getTerminalDisplayTitle(service.terminals[1], 1)).toBe('Workers');
  });

  it('stores per-terminal theme colors by id', () => {
    service.terminals = [
      makeTerminal({ id: 'terminal-1', name: '', shell: 'powershell', status: 'idle' }),
      makeTerminal({ id: 'terminal-2', name: '', shell: 'powershell', status: 'idle' }),
    ];

    service.updateTerminalThemeColors('terminal-2', '#eeeeee', '#101010');

    expect(service.terminals[1].theme).toEqual({ foreground: '#eeeeee', background: '#101010' });
    service.resetTerminalTheme('terminal-2');
    expect(service.terminals[1].theme).toBeNull();
  });

  it('currentWorkspaceDraft persists flat terminals and not tabs', () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceShellProfile = 'cmd';
    service.workspaceName = 'Demo';
    service.workingDirectory = 'C:\\Projects\\Demo';
    service.focusedTerminalId = 'terminal-1';
    service.paneColSplit = 62;
    service.paneRowSplit = 48;
    service.terminals = [
      makeTerminal({
        id: 'terminal-1',
        name: 'API Server',
        cwd: 'C:\\Projects\\Demo',
        status: 'running',
      }),
    ];

    const draft = service.currentWorkspaceDraft();
    expect(draft.shell).toBe('cmd');
    expect(draft.sessionSnapshot?.terminals?.length).toBe(1);
    expect(draft.sessionSnapshot?.terminals?.[0].name).toBe('API Server');
    expect(draft.sessionSnapshot?.layout.focusedTerminalId).toBe('terminal-1');
    expect(draft.sessionSnapshot?.layout.colSplit).toBe(62);
    expect(draft.sessionSnapshot?.layout.rowSplit).toBe(48);
    expect(draft.sessionSnapshot?.tabs).toBeUndefined();
  });

  it('createWorkspace writes a flat empty terminals snapshot', async () => {
    const created = await service.createWorkspace({
      name: 'Fresh',
      cwd: 'C:\\Projects\\Fresh',
    });

    expect(workspaceBridge.createWorkspace).toHaveBeenCalled();
    const payload = workspaceBridge.createWorkspace.calls.mostRecent().args[0];
    expect(payload.sessionSnapshot.terminals).toEqual([]);
    expect(payload.sessionSnapshot.tabs).toBeUndefined();
    expect(payload.sessionSnapshot.layout.focusedTerminalId).toBe('');
    expect(created.id).toBe('ws-created');
    expect(service.terminals).toEqual([]);
  });

  it('persists workspace shell profile updates', async () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceName = 'Demo';
    service.workingDirectory = 'C:\\Projects\\Demo';
    service.activeWorkspace = makeWorkspace();
    service.terminals = [];

    await service.updateWorkspaceShellProfile('powershell');

    expect(service.workspaceShellProfile).toBe('powershell');
    expect(workspaceBridge.saveWorkspace).toHaveBeenCalledWith(
      jasmine.objectContaining({ shell: 'powershell' })
    );
  });

  it('loadReferencePreviewState has four terminals', () => {
    const workspace = service.loadReferencePreviewState();

    expect(service.previewMode).toBeTrue();
    expect(service.terminals.length).toBe(4);
    expect(service.workspaceSummary.paneCount).toBe(4);
    expect(workspace.sessionSnapshot.terminals?.length).toBe(4);
    expect(service.terminals.map((terminal) => terminal.name)).toEqual([
      'API',
      'Angular',
      'Database',
      'Docker',
    ]);

    const terminal = service.terminals[0];
    expect(service.getTerminalStatusLabel(terminal)).toBe('Running');
    expect(service.isTerminalRunning(terminal)).toBeTrue();
    expect(service.getTerminalMetaLine(terminal)).toBe('main • 7192');
    expect(service.getTerminalPreviewText(terminal)).toContain('dotnet run');
  });

  it('records session launch and event recovery metadata by terminal id', () => {
    service.terminals = [
      makeTerminal({
        id: 'terminal-1',
        name: 'API',
        shell: 'powershell',
        status: 'running',
      }),
    ];
    service.focusedTerminalId = 'terminal-1';
    service.workingDirectory = 'C:\\Projects\\Demo';

    service.recordSessionLaunch('terminal-1', {
      shell: 'powershell',
      startedAt: '2026-06-23T09:00:00.000Z',
    });
    expect(service.recoverySnapshot.lastLaunchAt).toBe('2026-06-23T09:00:00.000Z');
    expect(service.recoverySnapshot.lastAttachedPaneId).toBe('terminal-1');

    service.recordSessionEvent('terminal-1', {
      status: 'failed',
      reason: 'Process exited with error',
      startedAt: '2026-06-23T09:00:00.000Z',
      lastActiveAt: '2026-06-23T09:03:00.000Z',
      endedAt: '2026-06-23T09:03:10.000Z',
      exitCode: 1,
      detectedPort: 4200,
    });

    expect(service.sessionHistory[0].status).toBe('failed');
    expect(service.sessionHistory[0].paneId).toBe('terminal-1');
    expect(service.sessionHistory[0].terminalTitle).toBe('API');
    expect(service.recoverySnapshot.lastExitCode).toBe(1);
  });

  it('keeps real workspace selection out of preview mode', async () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceName = 'Workspace 1';
    service.workingDirectory = 'C:\\Projects\\One';
    service.terminals = [
      makeTerminal({
        id: 'terminal-1',
        cwd: 'C:\\Projects\\One',
        status: 'running',
      }),
    ];
    service.focusedTerminalId = 'terminal-1';
    service.previewMode = false;

    await service.selectWorkspace('ws-2');

    expect(service.previewMode).toBeFalse();
    expect(service.workspaceName).toBe('Workspace 2');
    expect(service.terminals.length).toBe(1);
    expect(service.terminals[0].id).toBe('terminal-1');
  });
});
