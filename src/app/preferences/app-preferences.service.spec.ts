import { TestBed } from '@angular/core/testing';

import { AppPreferencesService } from './app-preferences.service';

describe('AppPreferencesService', () => {
  let service: AppPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppPreferencesService);
    localStorage.clear();
  });

  it('persists and clamps bottom panel height', () => {
    service.writeBottomPanelHeight(640);

    expect(service.readBottomPanelHeight()).toBe(520);
  });

  it('returns the default height when storage is empty', () => {
    expect(service.readBottomPanelHeight()).toBe(280);
  });

  it('defaults new sessions to the focused terminal directory', () => {
    expect(service.readNewSessionStartMode()).toBe('focused-tab');
    expect(service.readNewSessionCustomPath()).toBe('');
  });

  it('persists the new session start mode and trimmed custom path', () => {
    service.writeNewSessionStartMode('custom');
    service.writeNewSessionCustomPath('  C:\\Projects\\NthTerm  ');

    expect(service.readNewSessionStartMode()).toBe('custom');
    expect(service.readNewSessionCustomPath()).toBe('C:\\Projects\\NthTerm');
  });
});
