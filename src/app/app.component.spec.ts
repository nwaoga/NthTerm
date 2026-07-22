import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppBridgeService } from './app-bridge.service';
import { AppPreferencesService } from './preferences/app-preferences.service';
import { SystemBridgeService } from './system-bridge.service';
import { TerminalBridgeService } from './terminal-bridge.service';
import { WorkspaceBridgeService } from './workspace-bridge.service';

describe('AppComponent', () => {
  const originalInnerWidth = window.innerWidth;
  let workspaceBridge: {
    listWorkspaces: jasmine.Spy;
    getLaunchWorkspace: jasmine.Spy;
    getDirectoryDefaults: jasmine.Spy;
    createWorkspace: jasmine.Spy;
    saveWorkspace: jasmine.Spy;
    setActiveWorkspace: jasmine.Spy;
  };

  beforeEach(async () => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
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
            listWslDistros: async () => ['Ubuntu'],
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

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
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
    spyOn(preferences, 'writeWorkspaceBottomPanelHeight').and.callThrough();

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
    expect(preferences.writeWorkspaceBottomPanelHeight).toHaveBeenCalledWith(
      (fixture.componentInstance as any).ws.selectedWorkspaceId,
      expectedHeight
    );

    const workspaceShell: HTMLElement | null = fixture.nativeElement.querySelector('.workspace-shell');
    expect(workspaceShell?.style.getPropertyValue('--dock-height')).toBe(`${expectedHeight}px`);
  });

  it('persists inspector panel visibility changes from the workspace area', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const preferences = TestBed.inject(AppPreferencesService);
    spyOn(preferences, 'writeInspectorPanelVisible').and.callThrough();

    const component = fixture.componentInstance as any;
    component.setInspectorPanelPreference(false);
    fixture.detectChanges();

    expect(component.inspectorPanelVisible).toBeFalse();
    expect(preferences.writeInspectorPanelVisible).toHaveBeenCalledWith(false);
    expect(fixture.nativeElement.querySelector('.content-layout.inspector-hidden')).not.toBeNull();
  });

  it('collapses and restores the dock while persisting the active workspace preference', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const preferences = TestBed.inject(AppPreferencesService);
    spyOn(preferences, 'writeWorkspaceBottomPanelVisible').and.callThrough();

    fixture.nativeElement.querySelector('[aria-label="Hide workspace dock"]').click();
    fixture.detectChanges();

    expect((fixture.componentInstance as any).utilityPanelVisible).toBeFalse();
    expect(fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]')).not.toBeNull();

    fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]').click();
    fixture.detectChanges();

    expect((fixture.componentInstance as any).utilityPanelVisible).toBeTrue();
    expect(preferences.writeWorkspaceBottomPanelVisible).toHaveBeenCalledWith(
      (fixture.componentInstance as any).ws.selectedWorkspaceId,
      false
    );
  });

  it('handles terminal, split, and dock keyboard workflows', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as any;
    const createTerminal = spyOn(component, 'onCreateTerminal').and.resolveTo();
    const cycleTerminal = spyOn(component.ws, 'cycleTerminal').and.resolveTo(null);
    const initialDockVisibility = component.utilityPanelVisible;

    component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 't', ctrlKey: true }));
    component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true }));
    component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true }));
    component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, altKey: true }));
    component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true }));
    await fixture.whenStable();

    expect(createTerminal).toHaveBeenCalledWith(undefined);
    expect(createTerminal).toHaveBeenCalledTimes(2);
    expect(cycleTerminal).toHaveBeenCalledWith(1);
    expect(cycleTerminal).toHaveBeenCalledTimes(2);
    expect(component.utilityPanelVisible).toBe(!initialDockVisibility);
  });

  it('auto-collapses the inspector in compact windows without overwriting its preference', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    const preferences = TestBed.inject(AppPreferencesService);
    spyOn(preferences, 'readInspectorPanelVisible').and.returnValue(true);
    spyOn(preferences, 'writeInspectorPanelVisible').and.callThrough();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as any;
    expect(component.inspectorPanelVisible).toBeFalse();

    component.setInspectorPanelPreference(true);
    expect(component.inspectorPanelVisible).toBeTrue();
    expect(preferences.writeInspectorPanelVisible).not.toHaveBeenCalled();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    window.dispatchEvent(new Event('resize'));

    expect(component.inspectorPanelVisible).toBeTrue();
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

  it('uses the workspace shell profile when creating a terminal from the toolbar default action', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as any;
    const preferences = TestBed.inject(AppPreferencesService);
    spyOn(preferences, 'readDefaultShell').and.returnValue('powershell');
    spyOn(component.ws, 'resolveNewTerminalShell').and.returnValue('cmd');
    spyOn(component.ws, 'createTerminalDraft').and.returnValue({
      id: 'terminal-created',
      cwd: 'C:\\',
      shell: 'cmd',
      startupCommand: '',
      status: 'idle',
      session: null,
    });
    spyOn(component.ws, 'addTerminal').and.callThrough();

    await component.onCreateTerminal(undefined);

    expect(component.ws.resolveNewTerminalShell).toHaveBeenCalledWith(undefined, 'powershell');
    expect(component.ws.createTerminalDraft).toHaveBeenCalledWith('cmd');
    expect(component.ws.addTerminal).toHaveBeenCalled();
  });

  it('creates a terminal from the toolbar default action', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as any;
    const preferences = TestBed.inject(AppPreferencesService);
    const terminal = {
      id: 'terminal-created',
      cwd: 'C:\\',
      shell: 'powershell',
      startupCommand: '',
      status: 'idle',
      session: null,
    };
    spyOn(preferences, 'readDefaultShell').and.returnValue('powershell');
    spyOn(component.ws, 'resolveNewTerminalShell').and.returnValue('powershell');
    spyOn(component.ws, 'createTerminalDraft').and.returnValue(terminal);
    spyOn(component.ws, 'addTerminal');
    spyOn(component.terminal, 'focusTerminal');

    await component.onCreateTerminal(undefined);

    expect(component.ws.resolveNewTerminalShell).toHaveBeenCalledWith(undefined, 'powershell');
    expect(component.ws.createTerminalDraft).toHaveBeenCalledWith('powershell');
    expect(component.ws.addTerminal).toHaveBeenCalledWith(terminal);
    expect(component.terminal.focusTerminal).toHaveBeenCalledWith('terminal-created');
  });
});
