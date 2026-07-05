import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from './workspace-runtime.service';
import { WorkspaceBridgeService } from '../workspace-bridge.service';
import { MAX_TABS_PER_WORKSPACE, MAX_TERMINALS_PER_TAB } from './workspace-snapshot';

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
      saveWorkspace: jasmine.createSpy('saveWorkspace').and.callFake(async (draft: unknown) => draft),
      createWorkspace: jasmine.createSpy('createWorkspace').and.callFake(async (draft: any) => ({
        id: 'ws-created',
        shell: '',
        templateId: draft.templateId || 'empty-workspace',
        icon: draft.icon || 'cloud',
        accent: draft.accent || 'slate',
        layoutMode: draft.layoutMode || 'grid-2x2',
        launchProfile: draft.launchProfile || 'manual',
        sessionSnapshot: draft.sessionSnapshot,
        updatedAt: '2026-07-02T00:00:00.000Z',
        ...draft,
      })),
      setActiveWorkspace: jasmine.createSpy('setActiveWorkspace').and.resolveTo({
        id: 'ws-2',
        name: 'Workspace 2',
        cwd: 'C:\\Projects\\Two',
        shell: '',
        templateId: 'empty-workspace',
        icon: 'cloud',
        accent: 'violet',
        layoutMode: 'grid-2x2',
        launchProfile: 'manual',
        sessionSnapshot: {
          layout: {
            mode: 'grid-2x2',
            activeTabId: 'tab-2',
            focusedTerminalId: 'terminal-1',
            panes: [],
          },
          tabs: [
            {
              id: 'tab-2',
              title: 'Workspace 2',
              cwd: 'C:\\Projects\\Two',
              accent: 'violet',
              layoutMode: 'grid-2x2',
              colSplit: 50,
              rowSplit: 50,
              focusedTerminalId: 'terminal-1',
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
          ],
        },
        updatedAt: '2026-07-02T00:00:00.000Z',
      }),
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

  it('creates tabs without auto-adding terminals', () => {
    service.selectedWorkspaceId = 'ws-1';
    service.activeWorkspace = {
      id: 'ws-1',
      name: 'Demo',
      cwd: 'C:\\Projects\\Demo',
      shell: '',
      templateId: 'empty-workspace',
      icon: 'cloud',
      accent: 'violet',
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
      updatedAt: '2026-07-02T00:00:00.000Z',
      sessionSnapshot: {
        layout: { mode: 'grid-2x2', activeTabId: 'tab-1', focusedTerminalId: '', panes: [] },
        tabs: [],
      },
    };

    const tab = service.createTabDraft();
    expect(tab).not.toBe('blocked');
    if (!tab || tab === 'blocked') {
      return;
    }

    service.addTab(tab);
    expect(service.getActiveTabTerminals()).toEqual([]);
  });

  it('enforces tab and terminal limits', () => {
    service.selectedWorkspaceId = 'ws-1';
    service.activeWorkspace = {
      id: 'ws-1',
      name: 'Demo',
      cwd: 'C:\\',
      shell: '',
      templateId: 'empty-workspace',
      icon: 'cloud',
      accent: 'violet',
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
      updatedAt: '2026-07-02T00:00:00.000Z',
      sessionSnapshot: {
        layout: { mode: 'grid-2x2', activeTabId: 'tab-0', focusedTerminalId: '', panes: [] },
        tabs: [],
      },
    };
    service.runtimeTabs = Array.from({ length: MAX_TABS_PER_WORKSPACE }, (_, index) => ({
      id: `tab-${index}`,
      title: `Tab ${index}`,
      cwd: 'C:\\',
      accent: 'violet',
      layoutMode: 'grid-2x2' as const,
      colSplit: 50,
      rowSplit: 50,
      focusedTerminalId: '',
      terminals: [],
    }));
    service.activeTabId = 'tab-0';
    service.selectedWorkspaceId = 'ws-1';

    expect(service.createTabDraft()).toBe('blocked');

    service.runtimeTabs[0].terminals = Array.from({ length: MAX_TERMINALS_PER_TAB }, (_, index) => ({
      id: `terminal-${index}`,
      cwd: 'C:\\',
      shell: '',
      startupCommand: '',
      status: 'idle',
      session: null,
    }));

    expect(service.createTerminalDraft()).toBe('blocked');
  });

  it('includes tab-owned terminals in workspace draft', async () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceName = 'Demo';
    service.workingDirectory = 'C:\\Projects\\Demo';
    service.activeTabId = 'tab-1';
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Main',
        cwd: 'C:\\Projects\\Demo',
        accent: 'violet',
        layoutMode: 'grid-2',
        colSplit: 62,
        rowSplit: 48,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Projects\\Demo',
            shell: '',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
    ];

    const draft = service.currentWorkspaceDraft();
    expect(draft.sessionSnapshot?.tabs[0].terminals?.length).toBe(1);
    expect(draft.sessionSnapshot?.tabs[0].colSplit).toBe(62);
    expect(draft.sessionSnapshot?.layout.activeTabId).toBe('tab-1');
  });

  it('derives reference pane metadata in preview mode', () => {
    service.loadReferencePreviewState();
    const terminal = service.getActiveTabTerminals()[0];

    expect(terminal).toBeDefined();
    if (!terminal) {
      return;
    }

    expect(service.getTerminalStatusLabel(terminal)).toBe('Running');
    expect(service.isTerminalRunning(terminal)).toBeTrue();
    expect(service.getTerminalMetaLine(terminal)).toBe('main • 7192');
    expect(service.getTerminalPreviewText(terminal)).toContain('dotnet run');
  });

  it('records recovery metadata when a session event is captured', () => {
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Main',
        cwd: 'C:\\Projects\\Demo',
        accent: 'violet',
        layoutMode: 'grid-2x2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Projects\\Demo',
            shell: 'powershell',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
    ];
    service.activeTabId = 'tab-1';

    service.recordSessionEvent(service.runtimeTabs[0], 'terminal-1', {
      status: 'failed',
      reason: 'Process exited with error',
      startedAt: '2026-06-23T09:00:00.000Z',
      lastActiveAt: '2026-06-23T09:03:00.000Z',
      endedAt: '2026-06-23T09:03:10.000Z',
      exitCode: 1,
      detectedPort: 4200,
    });

    expect(service.sessionHistory[0].status).toBe('failed');
    expect(service.recoverySnapshot.lastExitCode).toBe(1);
  });

  it('keeps real workspace selection out of preview mode', async () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceName = 'Workspace 1';
    service.workingDirectory = 'C:\\Projects\\One';
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Workspace 1',
        cwd: 'C:\\Projects\\One',
        accent: 'violet',
        layoutMode: 'grid-2x2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Projects\\One',
            shell: '',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
    ];
    service.activeTabId = 'tab-1';
    service.previewMode = false;

    await service.selectWorkspace('ws-2');

    expect(service.previewMode).toBeFalse();
    expect(service.workspaceName).toBe('Workspace 2');
    expect(service.getActiveTabTerminals().length).toBe(1);
  });

  it('removes a terminal from the active tab', async () => {
    service.selectedWorkspaceId = 'ws-1';
    service.activeWorkspace = {
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
        layout: { mode: 'grid-2', activeTabId: 'tab-1', focusedTerminalId: 'terminal-1', panes: [] },
        tabs: [],
      },
    };
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Main',
        cwd: 'C:\\Projects\\Demo',
        accent: 'violet',
        layoutMode: 'grid-2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Projects\\Demo',
            shell: '',
            startupCommand: '',
            status: 'running',
            session: null,
          },
          {
            id: 'terminal-2',
            cwd: 'C:\\Projects\\Demo',
            shell: '',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
    ];
    service.activeTabId = 'tab-1';

    const result = await service.removeTerminal('terminal-1');

    expect(result).toEqual(jasmine.objectContaining({ id: 'terminal-2' }));
    expect(service.getActiveTabTerminals().length).toBe(1);
  });
});
