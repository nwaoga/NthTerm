import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppBridgeService } from './app-bridge.service';
import { SystemBridgeService } from './system-bridge.service';
import { TerminalBridgeService } from './terminal-bridge.service';
import { WorkspaceBridgeService } from './workspace-bridge.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: TerminalBridgeService,
          useValue: {
            createSession: async () => 'terminal-1',
            sendInput: async () => undefined,
            resizeSession: async () => undefined,
            disposeSession: async () => undefined,
            interruptSession: async () => undefined,
            getSessionInfo: async () => null,
            onData: () => () => undefined,
            onExit: () => () => undefined,
            onInfo: () => () => undefined,
          },
        },
        {
          provide: SystemBridgeService,
          useValue: {
            getMetrics: async () => null,
            getSessionEnvironment: async () => [],
          },
        },
        {
          provide: AppBridgeService,
          useValue: {
            onBeforeQuit: () => () => undefined,
            quitReady: async () => undefined,
          },
        },
        {
          provide: WorkspaceBridgeService,
          useValue: {
            listWorkspaces: async () => [
              {
                id: 'workspace-1',
                name: 'Default Workspace',
                cwd: 'C:\\',
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
                      cwd: 'C:\\',
                      status: 'running',
                      accent: 'violet',
                      shell: '',
                      startupCommand: '',
                    },
                  ],
                },
                updatedAt: '2026-06-17T00:00:00.000Z',
              },
            ],
            getLaunchWorkspace: async () => ({
              id: 'default',
              name: 'Default Workspace',
              cwd: 'C:\\',
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
                    cwd: 'C:\\',
                    status: 'running',
                    accent: 'violet',
                    shell: '',
                    startupCommand: '',
                  },
                ],
              },
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            createWorkspace: async () => ({
              id: 'workspace-2',
              name: 'Angular App',
              cwd: 'C:\\Projects\\AngularApp',
              shell: '',
              templateId: 'angular-app',
              icon: 'spark',
              accent: 'amber',
              layoutMode: 'grid-2x2',
              launchProfile: 'manual',
              sessionSnapshot: { layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] }, tabs: [] },
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            saveWorkspace: async () => ({
              id: 'default',
              name: 'Default Workspace',
              cwd: 'C:\\',
              shell: '',
              templateId: 'empty-workspace',
              icon: 'cloud',
              accent: 'violet',
              layoutMode: 'grid-2x2',
              launchProfile: 'manual',
              sessionSnapshot: { layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] }, tabs: [] },
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            setActiveWorkspace: async () => ({
              id: 'default',
              name: 'Default Workspace',
              cwd: 'C:\\',
              shell: '',
              templateId: 'empty-workspace',
              icon: 'cloud',
              accent: 'violet',
              layoutMode: 'grid-2x2',
              launchProfile: 'manual',
              sessionSnapshot: { layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] }, tabs: [] },
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('creates the app', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
