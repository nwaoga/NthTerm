import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AppPreferencesService } from '../preferences/app-preferences.service';
import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
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

  const runtimeTab = {
    id: 'tab-1',
    title: 'API',
    cwd: 'C:/repo',
    accent: 'violet',
    layoutMode: 'grid-2' as const,
    colSplit: 50,
    rowSplit: 50,
    focusedTerminalId: 'terminal-1',
    terminals: [runtimeTerminal],
  };

  const workspaceService = {
    runtimeTabs: [runtimeTab],
    layoutMode: 'grid-2',
    paneResizeMode: null,
    paneColSplit: 50,
    paneRowSplit: 50,
    workingDirectory: 'C:/repo',
    sessionHistory: [
      {
        id: 'history-1',
        tabTitle: 'API',
        reason: 'Process exited',
        startedAt: '2026-07-01T08:00:00.000Z',
        endedAt: '2026-07-01T08:30:00.000Z',
        lastActiveAt: '2026-07-01T08:25:00.000Z',
      },
    ],
    createTabDraft: () => null,
    createTerminalDraft: () => null,
    addTab: () => undefined,
    addTerminal: () => undefined,
    persistWorkspaceState: async () => undefined,
    selectTab: async () => runtimeTab,
    closeTab: jasmine.createSpy('closeTab').and.resolveTo(null),
    removeTerminal: jasmine.createSpy('removeTerminal').and.resolveTo(runtimeTerminal),
    focusTerminal: async () => 'unchanged',
    updatePaneSplit: () => undefined,
    isTabActive: () => true,
    isTerminalFocused: () => true,
    getActiveTabTerminals: () => [runtimeTerminal],
    getEffectiveActiveLayoutMode: () => 'grid-2',
    getFocusedTab: () => runtimeTab,
    getFocusedTerminal: () => runtimeTerminal,
    getTerminalDisplayTitle: () => 'API Server',
    getTerminalSummaryLine: () => 'Focused terminal',
    getTerminalStatusLabel: () => 'Running',
    isTerminalRunning: () => true,
    getTerminalMetaLine: () => 'main • 7192',
    shouldRenderTerminalPreview: () => true,
    getTerminalPreviewText: () => '$ npm run api',
    getTerminalTone: () => 'violet',
    focusedPaneId: 'terminal-1',
    usesDefaultTerminalTheme: () => true,
    updateFocusedTerminalShell: () => undefined,
    updateFocusedTerminalThemeColors: () => undefined,
    resetFocusedTerminalTheme: () => undefined,
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
  };

  const utilityPanelService = {
    getRecentCommands: () => [
      { id: 'cmd-1', command: 'npm run api', timestamp: '2026-07-01T08:11:00.000Z' },
    ],
    appendOutput: () => undefined,
  };

  const inspectorPresenter = {
    activeTab: 'tab' as 'tab' | 'session',
    getInspectorSummaryItems: () => [
      { label: 'Shell', value: 'PowerShell' },
      { label: 'Directory', value: 'C:/repo/apps/api' },
      { label: 'Git Branch', value: 'main' },
      { label: 'Process', value: 'npm run api' },
      { label: 'Started', value: 'Today at 09:15:42' },
      { label: 'Uptime', value: '00:12:48' },
      { label: 'Port', value: 'https://localhost:7192' },
    ],
    getInspectorItems: () =>
      inspectorPresenter.activeTab === 'session'
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
            { label: 'Directory', value: 'C:/repo/apps/api' },
            { label: 'Shell', value: 'PowerShell' },
            { label: 'Workspace', value: 'Cloud POS' },
            { label: 'Layout', value: 'grid-2' },
            { label: 'Focused Terminal', value: 'terminal-1' },
            { label: 'Startup Command', value: 'npm run api' },
            { label: 'Launch Profile', value: 'dev' },
            { label: 'Status', value: 'running' },
            { label: 'Last Recovery', value: 'Process exited' },
            { label: 'Last Session Ended', value: 'ts:end' },
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
    inspectorPresenter.activeTab = 'tab';

    await TestBed.configureTestingModule({
      imports: [WorkspaceAreaComponent],
      providers: [
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
          },
        },
      ],
    }).compileComponents();
  });

  it('renders tab detail cards by default', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Workspace Context');
    expect(text).toContain('Launch + Recovery');
    expect(text).toContain('Recent Commands');
    expect(text).not.toContain('Environment Variables');
  });

  it('renders the center workspace stage with tab strip and terminal cards', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workspace-stage')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-grid')?.getAttribute('data-layout')).toBe('single');
    expect(fixture.nativeElement.querySelector('.tab-strip .workspace-tab.active')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-grid .terminal-card.focused')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-state-pill.running')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('main • 7192');
    expect(fixture.nativeElement.querySelector('.terminal-preview')?.textContent).toContain('npm run api');
  });

  it('shows an empty-state prompt when the active tab has no terminals', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    const component = fixture.componentInstance;
    spyOn(component as any, 'getActiveTerminals').and.returnValue([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workspace-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Add a shell to this tab');
  });

  it('labels terminal color controls separately from workspace chrome', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Terminal appearance');
    expect(text).toContain('Settings');
    expect(text).toContain('Colors');
  });

  it('switches to the live session inspector view', () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const tabButtons = fixture.debugElement.queryAll(By.css('.inspector-tabs button'));
    tabButtons[1].nativeElement.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(inspectorPresenter.activeTab).toBe('session');
    expect(text).toContain('Live Session');
    expect(text).toContain('Lifecycle + Recovery');
    expect(text).toContain('Environment Variables');
    expect(text).not.toContain('Launch + Recovery');
  });

  it('removes a terminal from the focused card', async () => {
    const fixture = TestBed.createComponent(WorkspaceAreaComponent);
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('[aria-label="Remove terminal"]'));
    removeButton.nativeElement.click();
    await fixture.whenStable();

    expect(workspaceService.removeTerminal).toHaveBeenCalledWith('terminal-1');
    expect(hostCoordinator.syncAndRestore).toHaveBeenCalled();
  });
});
