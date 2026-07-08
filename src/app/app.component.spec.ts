import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppBridgeService } from './app-bridge.service';
import { AppPreferencesService } from './preferences/app-preferences.service';
import { SystemBridgeService } from './system-bridge.service';
import { TerminalBridgeService } from './terminal-bridge.service';
import { WorkspaceBridgeService } from './workspace-bridge.service';

describe('AppComponent', () => {
  let workspaceBridge: {
    listWorkspaces: jasmine.Spy;
    getLaunchWorkspace: jasmine.Spy;
    getDirectoryDefaults: jasmine.Spy;
    createWorkspace: jasmine.Spy;
    saveWorkspace: jasmine.Spy;
    setActiveWorkspace: jasmine.Spy;
  };

  beforeEach(async () => {
    workspaceBridge = {
      listWorkspaces: jasmine.createSpy('listWorkspaces').and.resolveTo([
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
      ]),
      getLaunchWorkspace: jasmine.createSpy('getLaunchWorkspace').and.resolveTo({
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
      getDirectoryDefaults: jasmine
        .createSpy('getDirectoryDefaults')
        .and.resolveTo({ homeDirectory: 'C:\\Users\\blakb' }),
      createWorkspace: jasmine.createSpy('createWorkspace').and.callFake(async (workspace: any) => ({
        id: 'workspace-2',
        shell: '',
        layoutMode: 'grid-2x2',
        launchProfile: 'manual',
        sessionSnapshot: {
          layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] },
          tabs: [],
        },
        updatedAt: '2026-06-17T00:00:00.000Z',
        ...workspace,
      })),
      saveWorkspace: jasmine.createSpy('saveWorkspace').and.resolveTo({
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
      setActiveWorkspace: jasmine.createSpy('setActiveWorkspace').and.resolveTo({
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
    };

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
          useValue: workspaceBridge,
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

  it('persists the resized dock height when dragging the resize handle', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const preferences = TestBed.inject(AppPreferencesService);
    spyOn(preferences, 'writeBottomPanelHeight').and.callThrough();

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    const handle: HTMLDivElement | null = fixture.nativeElement.querySelector('.dock-resize-handle');
    expect(handle).not.toBeNull();

    handle!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 0 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 500 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();

    const statusBar: HTMLElement | null = fixture.nativeElement.querySelector('.status-bar');
    const statusBarHeight = statusBar?.getBoundingClientRect().height ?? 36;
    const expectedHeight = 900 - 500 - statusBarHeight - 10;

    expect((fixture.componentInstance as any).utilityPanelHeight).toBe(expectedHeight);
    expect(preferences.writeBottomPanelHeight).toHaveBeenCalledWith(expectedHeight);

    const workspaceShell: HTMLElement | null = fixture.nativeElement.querySelector('.workspace-shell');
    expect(workspaceShell?.style.getPropertyValue('--dock-height')).toBe(`${expectedHeight}px`);
  });

  it('creates new workspaces from the configured custom directory', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as any;
    component.newSessionStartMode = 'custom';
    component.newSessionCustomPath = 'D:\\Workspaces\\NthTerm';

    await component.onNewSessionRequested();

    expect(workspaceBridge.createWorkspace).toHaveBeenCalledWith(
      jasmine.objectContaining({
        cwd: 'D:\\Workspaces\\NthTerm',
        name: 'New Workspace',
        templateId: '',
      })
    );
  });
});
