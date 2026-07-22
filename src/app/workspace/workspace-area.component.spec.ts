import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { InspectorMode } from '../models';
import { AppPreferencesService } from '../preferences/app-preferences.service';
import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { WorkspaceLayoutService } from './workspace-layout.service';
import { WorkspaceAreaComponent } from './workspace-area.component';

describe('WorkspaceAreaComponent', () => {
  const runtimeTerminal = {
    id: 'terminal-1',
    status: 'running',
    cwd: 'C:/repo/apps/api',
    shell: 'powershell',
    startupCommand: 'npm run api',
    session: null,
  };

  const workspaceService = {
    selectedWorkspace: 'Cloud POS',
    selectedWorkspaceId: 'workspace-1',
    workspaceName: 'Cloud POS',
    terminals: [runtimeTerminal],
    layoutMode: 'grid-2',
    paneResizeMode: null,
    paneColSplit: 50,
    paneRowSplit: 50,
    workingDirectory: 'C:/repo',
    workspaceShellProfile: '',
    sessionHistory: [
      {
        id: 'history-1',
        terminalTitle: 'API',
        reason: 'Process exited',
        startedAt: '2026-07-01T08:00:00.000Z',
        endedAt: '2026-07-01T08:30:00.000Z',
        lastActiveAt: '2026-07-01T08:25:00.000Z',
      },
    ],
    createTerminalDraft: jasmine.createSpy('createTerminalDraft').and.returnValue(null),
    addTerminal: () => undefined,
    persistWorkspaceState: async () => undefined,
    duplicateTerminal: jasmine.createSpy('duplicateTerminal').and.resolveTo(null),
    hasRunningTerminals: () => true,
    removeTerminal: jasmine.createSpy('removeTerminal').and.resolveTo(runtimeTerminal),
    focusTerminal: jasmine.createSpy('focusTerminal').and.resolveTo('unchanged'),
    updatePaneSplit: () => undefined,
    isTerminalFocused: () => true,
    getActiveTabTerminals: () => [runtimeTerminal],
    getEffectiveActiveLayoutMode: () => 'grid-2',
    getFocusedTerminal: () => runtimeTerminal,
    getTerminalDisplayTitle: () => 'API Server',
    getTerminalSummaryLine: () => 'Focused terminal',
    getTerminalStatusLabel: () => 'Running',
    isTerminalRunning: jasmine.createSpy('isTerminalRunning').and.returnValue(true),
    getTerminalById: () => runtimeTerminal,
    getTerminalMetaLine: () => 'main • 7192',
    shouldRenderTerminalPreview: () => true,
    getTerminalPreviewText: () => '$ npm run api',
    getTerminalTone: () => 'violet',
    focusedPaneId: 'terminal-1',
    usesDefaultTerminalTheme: () => true,
    updateFocusedTerminalShell: () => undefined,
    updateFocusedTerminalName: jasmine.createSpy('updateFocusedTerminalName'),
    updateTerminalName: jasmine.createSpy('updateTerminalName'),
    updateTerminalThemeColors: jasmine.createSpy('updateTerminalThemeColors'),
    resetTerminalTheme: jasmine.createSpy('resetTerminalTheme'),
    updateFocusedTerminalThemeColors: jasmine.createSpy('updateFocusedTerminalThemeColors'),
    resetFocusedTerminalTheme: jasmine.createSpy('resetFocusedTerminalTheme'),
    resolveNewTerminalShell: jasmine.createSpy('resolveNewTerminalShell').and.callFake((explicitShell, appDefaultShell) => explicitShell ?? appDefaultShell),
    updateWorkspaceShellProfile: jasmine.createSpy('updateWorkspaceShellProfile').and.resolveTo(undefined),
    getShellOptions: () => [
      { value: '', label: 'System Default' },
      { value: 'powershell', label: 'PowerShell' },
      { value: 'cmd', label: 'Command Prompt' },
      { value: 'wsl:Ubuntu', label: 'WSL: Ubuntu' },
    ],
    getWorkspaceShellProfileOptions: () => [
      { value: '', label: 'Use App Default' },
      { value: 'system', label: 'System Default' },
      { value: 'powershell', label: 'PowerShell' },
      { value: 'cmd', label: 'Command Prompt' },
      { value: 'wsl:Ubuntu', label: 'WSL: Ubuntu' },
    ],
    getCommandHistorySource: () => 'Cloud POS • API Server',
  };

  const terminalService = {
    sessionActive: true,
    sessionInfo: {
      id: 'pty-1',
      shell: 'PowerShell',
      pid: 1234,
      startedAt: '2026-07-01T08:00:00.000Z',
      endedAt: null,
      lastActiveAt: '2026-07-01T08:12:00.000Z',
      detectedPort: 7192,
      exitCode: null,
    },
    relaunchTerminal: jasmine.createSpy('relaunchTerminal'),
    interruptTerminal: jasmine.createSpy('interruptTerminal'),
    killTerminal: jasmine.createSpy('killTerminal'),
    reattachTerminalSession: jasmine.createSpy('reattachTerminalSession'),
    focusTerminal: jasmine.createSpy('focusTerminal'),
    applyTerminalTheme: jasmine.createSpy('applyTerminalTheme'),
    syncTerminalSize: () => undefined,
    setInteractiveTerminalId: jasmine.createSpy('setInteractiveTerminalId'),
    getBufferPreview: () => 'preview line',
    getPreviewVersion: () => 0,
  };

  const utilityPanelService = {
    getRecentCommands: () => [
      { id: 'cmd-1', command: 'npm run api', timestamp: '2026-07-01T08:11:00.000Z' },
    ],
    appendOutput: () => undefined,
  };

  const inspectorPresenter = {
    activeTab: 'workspace' as InspectorMode,
    getInspectorSummaryItems: () => [
      { label: 'Terminals', value: '1' },
      { label: 'Shell Profile', value: 'PowerShell' },
      { label: 'Arrangement', value: 'Full stage' },
      { label: 'Directory', value: 'C:/repo' },
    ],
    getInspectorItems: () =>
      inspectorPresenter.activeTab === 'terminal'
        ? [
            { label: 'Shell', value: 'PowerShell' },
            { label: 'Session Id', value: 'pty-1' },
            { label: 'PID', value: '1234' },
            { label: 'Port', value: '7192' },
            { label: 'Started', value: 'ts:start' },
            { label: 'Uptime', value: '12m 48s' },
            { label: 'Last Activity', value: 'ts:active' },
            { label: 'Exit Code', value: 'n/a' },
            { label: 'Recovery', value: 'Live session' },
          ]
        : [
            { label: 'Workspace', value: 'Cloud POS' },
            { label: 'Directory', value: 'C:/repo' },
            { label: 'Shell Profile', value: 'PowerShell' },
            { label: 'Terminals', value: '1' },
            { label: 'Last Saved', value: 'pending' },
          ],
  };

  const systemMonitorService = {
    getVisibleEnvironmentVariables: () => [{ name: 'NODE_ENV', value: 'development' }],
    formatClock: () => '08:11',
    formatTimestamp: () => 'ts',
    formatUptime: () => '12m 48s',
  };

  const hostCoordinator = {
    registerHostResolver: () => undefined,
    syncAndRestore: jasmine.createSpy('syncAndRestore').and.resolveTo(undefined),
  };

  beforeEach(async () => {
    inspectorPresenter.activeTab = 'workspace';
    workspaceService.isTerminalRunning.calls.reset();
    workspaceService.isTerminalRunning.and.returnValue(true);
    workspaceService.updateFocusedTerminalName.calls.reset();
    workspaceService.updateTerminalName.calls.reset();
    workspaceService.removeTerminal.calls.reset();
    workspaceService.terminals = [runtimeTerminal];
    workspaceService.focusedPaneId = 'terminal-1';
    workspaceService.getActiveTabTerminals = () => [runtimeTerminal];
    workspaceService.focusTerminal.calls.reset();
    workspaceService.focusTerminal.and.resolveTo('unchanged');
    workspaceService.getFocusedTerminal = () => runtimeTerminal;

    await TestBed.configureTestingModule({
      imports: [WorkspaceAreaComponent],
      providers: [
        WorkspaceLayoutService,
        { provide: WorkspaceRuntimeService, useValue: workspaceService },
        { provide: TerminalSessionService, useValue: terminalService },
        { provide: UtilityPanelService, useValue: utilityPanelService },
        { provide: InspectorPresenterService, useValue: inspectorPresenter },
        { provide: SystemMonitorService, useValue: systemMonitorService },
        { provide: TerminalHostCoordinatorService, useValue: hostCoordinator },
        {
          provide: AppPreferencesService,
          useValue: {
            readDefaultTerminalTheme: () => ({
              foreground: '#d8e1e8',
              background: '#0d1320',
              cursor: '#7dd3fc',
            }),
            readDefaultShell: () => '',
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(WorkspaceLayoutService).enterFocus();
  });

  it('renders a compact workspace overview and secondary detail sections by default', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('.inspector-overview-facts')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.inspector-summary-tile')).toBeNull();
    expect(text).toContain('Defaults');
    expect(text).toContain('Recent Commands');
    expect(text).not.toContain('Environment Variables');
  });

  it('shows workspace facts once and keeps defaults in a focused section', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[0].nativeElement.click();
    fixture.detectChanges();

    const inspector = fixture.nativeElement.querySelector('.inspector');
    const text = inspector.textContent;

    expect(inspector.querySelectorAll('.inspector-fact-row').length).toBeGreaterThan(0);
    expect(text).toContain('Defaults');
    expect(text).toContain('Workspace shell profile');
    expect(text).not.toContain('Workspace Context');
  });

  it('renders the center workspace stage with a focused terminal and no tab strip', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workspace-stage')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-terminal-focus-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.tab-strip')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-grid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.terminal-state-dot.running')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Focused terminal');
    expect(fixture.nativeElement.querySelector('.terminal-preview')?.textContent).toContain('npm run api');
  });

  it('keeps terminal context menus inside the viewport', () => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    try {
      const fixture = TestBed.createComponent(WorkspaceAreaComponent);
      fixture.detectChanges();
      const edgeEvent = new MouseEvent('contextmenu', { clientX: 795, clientY: 595 });

      (fixture.componentInstance as any).openTerminalContextMenu('terminal-1', edgeEvent);
      fixture.detectChanges();
      const menu = fixture.nativeElement.querySelector('.context-menu') as HTMLElement;

      expect(menu.style.left).toBe('602px');
      expect(menu.style.top).toBe('402px');
    } finally {
      if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor);
      else delete (window as unknown as Record<string, unknown>)['innerWidth'];
      if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor);
      else delete (window as unknown as Record<string, unknown>)['innerHeight'];
    }
  });

  it('shows an empty-state prompt when the workspace has no terminals', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    const component = fixture.componentInstance;
    spyOn(component as any, 'getActiveTerminals').and.returnValue([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workspace-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Empty workspace');
    expect(fixture.nativeElement.textContent).toContain('Start a terminal');
  });

  it('shows one focused terminal and parks the rest without a peer rail', () => {
    const terminals = Array.from({ length: 4 }, (_, index) => ({
      ...runtimeTerminal,
      id: `terminal-${index + 1}`,
    }));
    workspaceService.getActiveTabTerminals = () => terminals;
    workspaceService.terminals = terminals;
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-terminal-focus-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.terminal-session-park')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.terminal-park-host').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.pane-grid-zoomed')).toBeNull();
    expect(fixture.nativeElement.querySelector('.zoom-peer-1')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Terminal 1 of 4');
  });

  it('opens overview with preview cards and returns to focus when a card is selected', async () => {
    const terminals = Array.from({ length: 4 }, (_, index) => ({
      ...runtimeTerminal,
      id: `terminal-${index + 1}`,
    }));
    workspaceService.getActiveTabTerminals = () => terminals;
    workspaceService.terminals = terminals;
    workspaceService.focusTerminal.and.resolveTo(terminals[2]);
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.workspace-zoom-button[aria-label="Zoom out to overview"]')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-terminal-overview')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-terminal-preview-card').length).toBe(4);

    fixture.nativeElement.querySelector('[data-terminal-id="terminal-3"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-terminal-focus-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-terminal-overview')).toBeNull();
    expect(workspaceService.focusTerminal).toHaveBeenCalledWith('terminal-3');
  });

  it('toggles overview with Ctrl+\\\\ and jumps terminals with Ctrl+number', () => {
    const terminals = Array.from({ length: 3 }, (_, index) => ({
      ...runtimeTerminal,
      id: `terminal-${index + 1}`,
    }));
    workspaceService.getActiveTabTerminals = () => terminals;
    workspaceService.terminals = terminals;
    workspaceService.focusTerminal.and.callFake(async (id: string) => {
      workspaceService.focusedPaneId = id;
      return terminals.find((terminal) => terminal.id === id) || null;
    });
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '\\', ctrlKey: true, bubbles: true })
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-terminal-overview')).not.toBeNull();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', ctrlKey: true, bubbles: true })
    );
    fixture.detectChanges();
    expect(workspaceService.focusTerminal).toHaveBeenCalledWith('terminal-2');
  });

  it('labels terminal color controls separately from workspace chrome', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[1].nativeElement.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Terminal Settings');
    expect(text).toContain('Colors');
    expect(text).not.toContain('Workspace shell profile');
  });

  it('renames the focused terminal from terminal settings', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[1].nativeElement.click();
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('[aria-label="Terminal name"]')).nativeElement;
    input.value = 'API Server';
    input.dispatchEvent(new Event('change'));

    expect(workspaceService.updateFocusedTerminalName).toHaveBeenCalledOnceWith('API Server');
    expect(fixture.nativeElement.textContent).toContain('terminal-1');
  });

  it('renames a terminal from the focus header by double-click', async () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.terminal-title-button')).nativeElement.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true })
    );
    fixture.detectChanges();

    const renameInput = fixture.debugElement.query(By.css('.terminal-rename-input'));
    expect(renameInput).not.toBeNull();
    (fixture.componentInstance as any).editingTerminalName = 'API Backend';
    (fixture.componentInstance as any).commitRenameTerminal();
    await fixture.whenStable();

    expect(workspaceService.updateTerminalName).toHaveBeenCalledWith('terminal-1', 'API Backend');
  });

  it('updates focused terminal colors from the inspector', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[1].nativeElement.click();
    fixture.detectChanges();

    const colorInputs = fixture.debugElement.queryAll(By.css('.theme-color-input'));
    expect(colorInputs.length).toBeGreaterThanOrEqual(2);

    colorInputs[0].nativeElement.value = '#ffcc00';
    colorInputs[0].nativeElement.dispatchEvent(new Event('input'));
    colorInputs[1].nativeElement.value = '#112233';
    colorInputs[1].nativeElement.dispatchEvent(new Event('input'));

    expect(workspaceService.updateTerminalThemeColors).toHaveBeenCalled();
    expect(terminalService.applyTerminalTheme).toHaveBeenCalled();
  });

  it('updates the workspace shell profile from the inspector', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[0].nativeElement.click();
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('.inspector-shell-field .preference-select'));
    selects[0].nativeElement.value = 'cmd';
    selects[0].nativeElement.dispatchEvent(new Event('change'));

    expect(workspaceService.updateWorkspaceShellProfile).toHaveBeenCalledWith('cmd');
  });

  it('updates the workspace shell profile to a WSL distro', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.inspector-tabs button'))[0].nativeElement.click();
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('.inspector-shell-field .preference-select'));
    selects[0].nativeElement.value = 'wsl:Ubuntu';
    selects[0].nativeElement.dispatchEvent(new Event('change'));

    expect(workspaceService.updateWorkspaceShellProfile).toHaveBeenCalledWith('wsl:Ubuntu');
  });

  it('uses the workspace shell resolver when adding a terminal without an explicit shell', async () => {
    const draft = {
      ...runtimeTerminal,
      id: 'terminal-2',
      shell: 'powershell',
    };
    (workspaceService.createTerminalDraft as any) = jasmine.createSpy('createTerminalDraft').and.returnValue(draft);
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const addButton = fixture.debugElement.query(By.css('[aria-label="Add terminal"]'));
    addButton.nativeElement.click();
    await fixture.whenStable();

    expect(workspaceService.resolveNewTerminalShell).toHaveBeenCalledWith(undefined, '');
    expect(workspaceService.createTerminalDraft).toHaveBeenCalledWith('');
  });

  it('switches to the live session inspector view', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const tabButtons = fixture.debugElement.queryAll(By.css('.inspector-tabs button'));
    expect(tabButtons.length).toBe(2);
    tabButtons[1].nativeElement.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const envEntries = fixture.nativeElement.querySelectorAll('.env-entry');

    expect(inspectorPresenter.activeTab).toBe('terminal');
    expect(text).toContain('Live Session');
    expect(text).toContain('Lifecycle + Recovery');
    expect(text).toContain('Environment Variables');
    expect(envEntries.length).toBe(1);
    expect(envEntries[0].querySelector('span')?.textContent).toBe('NODE_ENV');
    expect(envEntries[0].querySelector('strong')?.textContent).toBe('development');
    expect(fixture.nativeElement.querySelector('.env-list .history-entry')).toBeNull();
  });

  it('hides and restores the inspector rail through panel visibility events', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    const visibilityChanges: boolean[] = [];
    fixture.componentInstance.inspectorPanelVisibleChange.subscribe((visible) =>
      visibilityChanges.push(visible)
    );
    fixture.detectChanges();

    const hideButton = fixture.debugElement.query(By.css('[aria-label="Hide inspector"]'));
    hideButton.nativeElement.click();

    fixture.componentInstance.inspectorPanelVisible = false;
    fixture.detectChanges();

    const restoreButton = fixture.debugElement.query(By.css('[aria-label="Show inspector"]'));
    restoreButton.nativeElement.click();

    expect(visibilityChanges).toEqual([false, true]);
    expect(fixture.nativeElement.querySelector('.content-layout.inspector-hidden')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.inspector')).toBeNull();
  });

  it('removes a terminal from the focused card', async () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const terminalCard = fixture.debugElement.query(By.css('.terminal-focus-card'));
    terminalCard.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    fixture.detectChanges();
    const removeButton = fixture.debugElement.queryAll(By.css('.context-menu [role="menuitem"]'))
      .find((button) => button.nativeElement.textContent.includes('Close Terminal'));
    removeButton!.nativeElement.click();
    await fixture.whenStable();

    expect(workspaceService.removeTerminal).toHaveBeenCalledWith('terminal-1');
    expect(hostCoordinator.syncAndRestore).toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalledWith('Close this terminal and stop its running process?');
  });
});
