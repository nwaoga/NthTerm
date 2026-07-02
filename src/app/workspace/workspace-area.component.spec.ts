import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { WorkspaceAreaComponent } from './workspace-area.component';

describe('WorkspaceAreaComponent', () => {
  const runtimeTab = {
    id: 'tab-1',
    title: 'API',
    status: 'running',
    cwd: 'C:/repo/apps/api',
    accent: 'violet',
    startupCommand: 'npm run api',
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
    addTab: () => undefined,
    persistWorkspaceState: async () => undefined,
    selectTab: async () => runtimeTab,
    closeTab: async () => false,
    focusPane: async () => 'unchanged',
    updatePaneSplit: () => undefined,
    isTabActive: () => true,
    isPaneFocused: () => true,
    getPaneById: (paneId: string) => paneId === 'pane-1' ? { id: 'pane-1' } : undefined,
    getPaneTab: () => runtimeTab,
    getPaneTone: () => 'violet',
    getFocusedTab: () => runtimeTab,
    getPaneDisplayTitle: () => 'API Server',
    getPaneSummaryLine: () => 'Focused pane',
    getPaneStatusLabel: () => 'Running',
    isPaneRunning: () => true,
    getPaneMetaLine: () => 'main • 7192',
    shouldRenderPanePreview: () => true,
    getPanePreviewText: () => '$ npm run api',
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
            { label: 'Template', value: 'api' },
            { label: 'Layout', value: 'grid-2' },
            { label: 'Focused Pane', value: 'pane-1' },
            { label: 'Startup Command', value: 'npm run api' },
            { label: 'Launch Profile', value: 'dev' },
            { label: 'Status', value: 'running' },
            { label: 'Last Recovery', value: 'Process exited' },
            { label: 'Last Session Ended', value: 'ts:end' },
            { label: 'Last Saved', value: 'pending' },
          ],
  };

  const systemMonitorService = {
    getVisibleEnvironmentVariables: () => [
      { name: 'NODE_ENV', value: 'development' },
    ],
    formatClock: () => '08:11',
    formatTimestamp: () => 'ts',
    formatUptime: () => '12m 48s',
  };

  const hostCoordinator = {
    registerHostResolver: () => undefined,
    syncAndRestore: async () => undefined,
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
    expect(fixture.nativeElement.querySelector('.tab-strip .tab-pill.active')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-grid .terminal-card.focused')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pane-state-pill.running')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('main • 7192');
    expect(fixture.nativeElement.querySelector('.terminal-preview')?.textContent).toContain('npm run api');
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
});
