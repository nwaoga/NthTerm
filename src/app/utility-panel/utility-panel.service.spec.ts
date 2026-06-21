import { TestBed } from '@angular/core/testing';

import { UtilityPanelService } from './utility-panel.service';

describe('UtilityPanelService', () => {
  let service: UtilityPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilityPanelService);
  });

  it('appends and clears output lines', () => {
    service.appendOutput('Workspace saved', 'info');
    expect(service.outputLines.length).toBe(1);
    expect(service.outputLines[0].message).toBe('Workspace saved');

    service.clearOutput();
    expect(service.outputLines.length).toBe(0);
  });

  it('deduplicates scanned terminal problems', () => {
    service.scanOutputForProblems('error: build failed\nerror: build failed', 'API');
    expect(service.problems.length).toBe(1);
    expect(service.problems[0].severity).toBe('error');
    expect(service.problems[0].source).toBe('API');
  });

  it('tracks command history entries', () => {
    service.trackCommand('dotnet build', 'API');
    expect(service.commandHistory[0].command).toBe('dotnet build');
    expect(service.getRecentCommands().length).toBe(1);
  });
});
