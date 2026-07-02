import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from './workspace-runtime.service';
import { WorkspaceBridgeService } from '../workspace-bridge.service';

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
        sessionSnapshot: {
          layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] },
          tabs: [],
        },
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
            focusedPaneId: 'pane-1',
            panes: [{ id: 'pane-1', tabId: 'tab-2' }],
          },
          tabs: [
            {
              id: 'tab-2',
              title: 'Workspace 2',
              cwd: 'C:\\Projects\\Two',
              status: 'running',
              accent: 'violet',
              shell: '',
              startupCommand: '',
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

  it('builds unique workspace names from existing sessions', () => {
    service.sessions = [
      { id: '1', name: 'Angular App', icon: 'spark', accent: 'amber' },
      { id: '2', name: 'Angular App 2', icon: 'spark', accent: 'amber' },
    ];

    expect(service.buildWorkspaceName('Angular App')).toBe('Angular App 3');
  });

  it('rebuilds pane assignments when layout mode changes', async () => {
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'One',
        cwd: 'C:\\',
        status: 'running',
        accent: 'violet',
        shell: '',
        startupCommand: '',
      },
      {
        id: 'tab-2',
        title: 'Two',
        cwd: 'C:\\',
        status: 'running',
        accent: 'amber',
        shell: '',
        startupCommand: '',
      },
      {
        id: 'tab-3',
        title: 'Three',
        cwd: 'C:\\',
        status: 'running',
        accent: 'blue',
        shell: '',
        startupCommand: '',
      },
    ];
    service.runtimePanes = [
      { id: 'pane-1', tabId: 'tab-1' },
      { id: 'pane-2', tabId: 'tab-2' },
      { id: 'pane-3', tabId: 'tab-3' },
      { id: 'pane-4', tabId: null },
    ];
    service.layoutMode = 'grid-2x2';
    service.selectedWorkspaceId = 'ws-1';

    await service.setLayoutMode('grid-2');

    expect(service.runtimePanes.length).toBe(2);
    expect(service.runtimePanes[0].tabId).toBe('tab-1');
    expect(service.runtimePanes[1].tabId).toBe('tab-2');
  });

  it('includes layout splits in workspace draft', () => {
    service.selectedWorkspaceId = 'ws-1';
    service.workspaceName = 'Demo';
    service.workingDirectory = 'C:\\Projects\\Demo';
    service.layoutMode = 'grid-2';
    service.paneColSplit = 62;
    service.paneRowSplit = 48;
    service.activeTabId = 'tab-1';
    service.focusedPaneId = 'pane-1';
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Main',
        cwd: 'C:\\Projects\\Demo',
        status: 'running',
        accent: 'violet',
        shell: '',
        startupCommand: '',
      },
    ];
    service.runtimePanes = [{ id: 'pane-1', tabId: 'tab-1' }, { id: 'pane-2', tabId: null }];
    service.sessionHistory = [
      {
        id: 'session-1',
        tabId: 'tab-1',
        tabTitle: 'Main',
        paneId: 'pane-1',
        shell: '',
        cwd: 'C:\\Projects\\Demo',
        status: 'stopped',
        reason: 'Process exited',
        startedAt: '2026-06-23T09:00:00.000Z',
        lastActiveAt: '2026-06-23T09:05:00.000Z',
        endedAt: '2026-06-23T09:05:30.000Z',
        exitCode: 0,
        detectedPort: null,
      },
    ];
    service.recoverySnapshot = {
      lastLaunchAt: '2026-06-23T09:00:00.000Z',
      lastAttachedPaneId: 'pane-1',
      lastAttachedTabId: 'tab-1',
      lastExitCode: 0,
      lastStopReason: 'Process exited',
      lastSessionEndedAt: '2026-06-23T09:05:30.000Z',
      lastRecoveredAt: '2026-06-23T09:06:00.000Z',
    };

    const draft = service.currentWorkspaceDraft();
    expect(draft.sessionSnapshot?.layout.colSplit).toBe(62);
    expect(draft.sessionSnapshot?.layout.rowSplit).toBe(48);
    expect(draft.sessionSnapshot?.layout.panes.length).toBe(2);
    expect(draft.sessionSnapshot?.history?.length).toBe(1);
    expect(draft.sessionSnapshot?.recovery?.lastStopReason).toBe('Process exited');
  });

  it('derives reference pane metadata in preview mode', () => {
    service.loadReferencePreviewState();
    const apiPane = service.getPaneById('pane-1');
    const dockerPane = service.getPaneById('pane-4');

    expect(apiPane).toBeDefined();
    expect(dockerPane).toBeDefined();
    if (!apiPane || !dockerPane) {
      return;
    }

    expect(service.getPaneStatusLabel(apiPane)).toBe('Running');
    expect(service.isPaneRunning(apiPane)).toBeTrue();
    expect(service.getPaneMetaLine(apiPane)).toBe('main • 7192');
    expect(service.getPaneMetaLine(dockerPane)).toBe('up • 4 containers');
    expect(service.getPanePreviewText(apiPane)).toContain('dotnet run');
  });

  it('records recovery metadata when a session event is captured', () => {
    service.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'Main',
        cwd: 'C:\\Projects\\Demo',
        status: 'running',
        accent: 'violet',
        shell: 'powershell',
        startupCommand: '',
      },
    ];

    service.recordSessionEvent(service.runtimeTabs[0], 'pane-1', {
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
    expect(service.recoverySnapshot.lastStopReason).toBe('Process exited with error');
  });

  it('leaves preview mode when a real workspace is applied', () => {
    service.loadReferencePreviewState();

    service.applyWorkspace({
      id: 'ws-live',
      name: 'Live Workspace',
      cwd: 'C:\\Projects\\Live',
      shell: '',
      templateId: 'empty-workspace',
      icon: 'cloud',
      accent: 'violet',
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
      sessionSnapshot: {
        layout: {
          mode: 'grid-2x2',
          activeTabId: 'tab-1',
          focusedPaneId: 'pane-1',
          panes: [{ id: 'pane-1', tabId: 'tab-1' }],
        },
        tabs: [
          {
            id: 'tab-1',
            title: 'Main',
            cwd: 'C:\\Projects\\Live',
            status: 'running',
            accent: 'violet',
            shell: '',
            startupCommand: '',
          },
        ],
      },
      updatedAt: '2026-07-02T00:00:00.000Z',
    });

    expect(service.previewMode).toBeFalse();
    expect(service.workspaceName).toBe('Live Workspace');
  });

  it('uses an override cwd when creating a workspace from a template', async () => {
    await service.createWorkspaceFromTemplate(
      {
        name: 'Empty Workspace',
        accent: 'slate',
        icon: 'person',
        templateId: 'empty-workspace',
        cwd: 'C:\\Fallback',
      },
      { cwd: 'C:\\Users\\blakb' }
    );

    expect(workspaceBridge.createWorkspace).toHaveBeenCalledWith(
      jasmine.objectContaining({
        cwd: 'C:\\Users\\blakb',
      })
    );
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
        status: 'running',
        accent: 'violet',
        shell: '',
        startupCommand: '',
      },
    ];
    service.runtimePanes = [{ id: 'pane-1', tabId: 'tab-1' }];
    service.previewMode = false;

    await service.selectWorkspace('ws-2');

    expect(service.previewMode).toBeFalse();
    expect(service.workspaceName).toBe('Workspace 2');
  });
});
