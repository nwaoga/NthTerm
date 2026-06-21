import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from './workspace-runtime.service';
import { WorkspaceBridgeService } from '../workspace-bridge.service';

describe('WorkspaceRuntimeService', () => {
  let service: WorkspaceRuntimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WorkspaceBridgeService,
          useValue: {
            listWorkspaces: async () => [],
            saveWorkspace: async (draft: unknown) => draft,
          },
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

    const draft = service.currentWorkspaceDraft();
    expect(draft.sessionSnapshot?.layout.colSplit).toBe(62);
    expect(draft.sessionSnapshot?.layout.rowSplit).toBe(48);
    expect(draft.sessionSnapshot?.layout.panes.length).toBe(2);
  });
});
