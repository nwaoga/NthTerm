import { TestBed } from '@angular/core/testing';

import { ReferenceReviewContentService } from './reference-review-content.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

describe('ReferenceReviewContentService', () => {
  let service: ReferenceReviewContentService;
  let workspace: WorkspaceRuntimeService;
  let utility: UtilityPanelService;
  let system: SystemMonitorService;
  let terminal: jasmine.SpyObj<TerminalSessionService>;

  beforeEach(() => {
    terminal = jasmine.createSpyObj('TerminalSessionService', ['setPreviewSessionInfo']);

    TestBed.configureTestingModule({
      providers: [
        ReferenceReviewContentService,
        WorkspaceRuntimeService,
        UtilityPanelService,
        SystemMonitorService,
      ],
    });

    service = TestBed.inject(ReferenceReviewContentService);
    workspace = TestBed.inject(WorkspaceRuntimeService);
    utility = TestBed.inject(UtilityPanelService);
    system = TestBed.inject(SystemMonitorService);
  });

  it('seeds the full Cloud POS review state for preview mode', () => {
    service.applyFullPreviewState(workspace, utility, system, terminal);

    expect(workspace.previewMode).toBeTrue();
    expect(workspace.workspaceName).toBe('Cloud POS');
    expect(workspace.terminals.length).toBe(4);
    expect(workspace.sessionHistory.length).toBe(2);
    expect(workspace.recoverySnapshot.lastStopReason).toBe('Clean restore');
    expect(workspace.lastSavedAt).toBe('Today at 09:12:05');
    expect(utility.problems.length).toBe(2);
    expect(utility.outputLines[0].message).toContain('OrderService');
    expect(system.systemMetrics?.memoryTotalGb).toBe(16);
    expect(system.environmentVariables.length).toBe(3);
    expect(terminal.setPreviewSessionInfo).toHaveBeenCalled();
    expect(utility.activeTab).toBe('output');
  });

  it('adds supplemental review content without replacing existing dock output', () => {
    utility.outputLines = [
      {
        id: 'existing',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Workspace shell initialized',
      },
    ];

    service.applySupplementalReviewContent(workspace, utility, system, terminal);

    expect(utility.problems.length).toBe(2);
    expect(utility.outputLines.length).toBe(1);
    expect(utility.outputLines[0].message).toBe('Workspace shell initialized');
    expect(workspace.sessionHistory.length).toBe(2);
  });
});
