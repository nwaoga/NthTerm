import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BottomDockComponent } from './bottom-dock.component';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { UtilityPanelId } from '../models';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

describe('BottomDockComponent', () => {
  const utilityPanelService = {
    activeTab: 'output' as UtilityPanelId,
    outputLines: [
      {
        id: 'out-1',
        timestamp: '2026-07-01T08:00:00.000Z',
        level: 'info' as const,
        message: 'OrderService - Processing order 12345',
      },
    ],
    problems: [
      {
        id: 'problem-1',
        severity: 'error' as const,
        message: 'Webpack warning in Angular build output',
        source: 'Angular',
        timestamp: '2026-07-01T08:00:00.000Z',
      },
      {
        id: 'problem-2',
        severity: 'warning' as const,
        message: 'Docker container restart detected',
        source: 'Docker',
        timestamp: '2026-07-01T08:00:00.000Z',
      },
    ],
    commandHistory: [
      {
        id: 'cmd-1',
        command: 'npm run api',
        timestamp: '2026-07-01T08:05:00.000Z',
        tabTitle: 'API',
      },
    ],
    searchQuery: 'cloud',
    getUtilityTabs: () => [
      { id: 'output', label: 'Output' },
      { id: 'problems', label: 'Problems', count: 2 },
      { id: 'search', label: 'Search' },
      { id: 'command-history', label: 'Command History', count: 1 },
    ],
    clearOutput: jasmine.createSpy('clearOutput'),
    clearProblems: jasmine.createSpy('clearProblems'),
  };

  const systemMonitorService = {
    systemMetrics: {
      cpuPercent: 23,
      memoryUsedGb: 6.2,
      memoryPercent: 39,
      memoryTotalGb: 16,
      diskPercent: 45,
      networkMbps: 12.4,
      networkDownloadMbps: 12.4,
      networkUploadMbps: 8.7,
      collectedAt: '2026-07-01T08:00:00.000Z',
    },
    formatMetric: (value: number | null | undefined, suffix = '') =>
      value === null || value === undefined ? 'n/a' : `${value}${suffix}`,
    getMemoryDisplay: () => '6.2 GB / 16 GB',
    getNetworkDisplay: () => '12.4 Mbps ↓ / 8.7 Mbps ↑',
    getMetricProgress: (metric: string) => (metric === 'cpu' ? 23 : 45),
    formatClock: () => '08:00',
  };

  beforeEach(async () => {
    utilityPanelService.activeTab = 'output';
    utilityPanelService.searchQuery = 'cloud';

    await TestBed.configureTestingModule({
      imports: [BottomDockComponent],
      providers: [
        { provide: UtilityPanelService, useValue: utilityPanelService },
        {
          provide: CommandPaletteService,
          useValue: {
            query: '',
            getSearchResultGroups: () => [
              {
                label: 'Workspaces',
                items: [{ id: 'ws-1', title: 'Cloud POS', detail: 'Workspace match' }],
              },
            ],
            executeSearchResult: async () => undefined,
          },
        },
        { provide: SystemMonitorService, useValue: systemMonitorService },
        { provide: TerminalSessionService, useValue: { rerunCommand: jasmine.createSpy('rerunCommand') } },
        { provide: WorkspaceRuntimeService, useValue: { previewMode: true } },
      ],
    }).compileComponents();
  });

  it('renders the output and monitor split on the default tab', () => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('.dock-content-split')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.metric-ring').length).toBe(4);
    expect(text).toContain('Workspace Dock');
    expect(text).toContain('Application Output');
    expect(text).toContain('OrderService - Processing order 12345');
    expect(text).toContain('6.2 GB / 16 GB');
    expect(text).toContain('12.4 Mbps ↓ / 8.7 Mbps ↑');
    expect(text).not.toContain('[08:00] info:');
  });

  it('shows the problems badge count in the dock tabs', () => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    fixture.detectChanges();

    const problemsTab = fixture.debugElement.queryAll(By.css('.dock-tab'))[1];

    expect(problemsTab.nativeElement.textContent).toContain('Problems');
    expect(problemsTab.nativeElement.querySelector('.dock-count')?.textContent).toBe('2');
  });

  it('switches to the problems panel', () => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    fixture.detectChanges();

    const tabs = fixture.debugElement.queryAll(By.css('.dock-tab'));
    tabs[1].nativeElement.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Webpack warning in Angular build output');
    expect(fixture.nativeElement.querySelector('.monitor-panel')).toBeNull();
  });

  it('renders search results and query summary on the search panel', () => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    utilityPanelService.activeTab = 'search';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Workspace Search');
    expect(text).toContain('1 matches for "cloud"');
    expect(text).toContain('Cloud POS');
  });

  it('renders command history entries on the command history panel', () => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    utilityPanelService.activeTab = 'command-history';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Command History');
    expect(text).toContain('1 captured commands');
    expect(text).toContain('npm run api');
  });

  it('focuses the search input when focusSearchInput is called', fakeAsync(() => {
    const fixture = TestBed.createComponent(BottomDockComponent);
    utilityPanelService.activeTab = 'output';
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.focusSearchInput();
    fixture.detectChanges();
    tick();

    expect(utilityPanelService.activeTab).toBe('search');
    const input = fixture.debugElement.query(By.css('input[type="search"]')).nativeElement as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  }));
});
