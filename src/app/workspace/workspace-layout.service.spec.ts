import { TestBed } from '@angular/core/testing';

import { WorkspaceLayoutService } from './workspace-layout.service';
import { WorkspaceRuntimeService } from './workspace-runtime.service';

describe('WorkspaceLayoutService', () => {
  let service: WorkspaceLayoutService;
  let workspace: {
    focusedTerminalId: string;
    focusedPaneId: string;
    getActiveTabTerminals: jasmine.Spy;
    getTerminalDisplayTitle: jasmine.Spy;
  };

  beforeEach(() => {
    workspace = {
      focusedTerminalId: 'terminal-1',
      focusedPaneId: 'terminal-1',
      getActiveTabTerminals: jasmine.createSpy('getActiveTabTerminals').and.returnValue([
        { id: 'terminal-1', name: 'One', cwd: 'C:\\a', shell: '', startupCommand: '', status: 'idle' },
        { id: 'terminal-2', name: 'Two', cwd: 'C:\\b', shell: '', startupCommand: '', status: 'idle' },
        { id: 'terminal-3', name: 'Three', cwd: 'C:\\c', shell: '', startupCommand: '', status: 'idle' },
      ]),
      getTerminalDisplayTitle: jasmine
        .createSpy('getTerminalDisplayTitle')
        .and.callFake((terminal: { name?: string }, index: number) => terminal.name || `Terminal ${index + 1}`),
    };

    TestBed.configureTestingModule({
      providers: [
        WorkspaceLayoutService,
        { provide: WorkspaceRuntimeService, useValue: workspace },
      ],
    });
    service = TestBed.inject(WorkspaceLayoutService);
  });

  it('defaults to focus mode with zoomLevel 0', () => {
    expect(service.viewMode).toBe('focus');
    expect(service.zoomLevel).toBe(0);
    expect(service.isFocusMode()).toBeTrue();
  });

  it('keeps viewMode and zoomLevel in sync', () => {
    service.setViewMode('overview');
    expect(service.viewMode).toBe('overview');
    expect(service.zoomLevel).toBe(1);

    service.setZoomLevel(0.2);
    expect(service.viewMode).toBe('focus');
    expect(service.zoomLevel).toBe(0.2);

    service.setZoomLevel(0.8);
    expect(service.viewMode).toBe('overview');

    service.snapZoomFromControl(0.4);
    expect(service.viewMode).toBe('focus');
    expect(service.zoomLevel).toBe(0);

    service.snapZoomFromControl(0.6);
    expect(service.viewMode).toBe('overview');
    expect(service.zoomLevel).toBe(1);
  });

  it('toggles overview and rebinds workspace id on switch', () => {
    service.bindWorkspace('ws-1', 'terminal-1');
    service.enterOverview();
    expect(service.isOverviewMode()).toBeTrue();

    service.bindWorkspace('ws-2', 'terminal-2');
    expect(service.viewMode).toBe('focus');
    expect(service.getSnapshot().workspaceId).toBe('ws-2');
    expect(service.activeTerminalId).toBe('terminal-2');
  });

  it('preserves view mode when rebinding the same workspace', () => {
    service.bindWorkspace('ws-1', 'terminal-1');
    service.enterOverview();
    service.bindWorkspace('ws-1', 'terminal-2');
    expect(service.viewMode).toBe('overview');
    expect(service.activeTerminalId).toBe('terminal-2');
  });

  it('announces active terminal changes and resolves shortcut indexes', () => {
    service.setActiveTerminalId('terminal-2');
    expect(service.announcementText).toContain('Terminal 2 of 3');
    expect(service.getTerminalIdForShortcut(1)).toBe('terminal-1');
    expect(service.getTerminalIdForShortcut(10)).toBeNull();
    expect(service.getAdjacentTerminalId(1)).toBe('terminal-3');
    expect(service.getAdjacentTerminalId(-1)).toBe('terminal-1');
  });
});
