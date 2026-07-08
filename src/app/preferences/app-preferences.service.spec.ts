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

  it('persists the default shell preference', () => {
    expect(service.readDefaultShell()).toBe('');

    service.writeDefaultShell('powershell');
    expect(service.readDefaultShell()).toBe('powershell');

    service.writeDefaultShell('zsh');
    expect(service.readDefaultShell()).toBe('zsh');
  });

  it('persists default terminal colors and system theme separately', () => {
    service.writeDefaultTerminalTheme({
      foreground: '#abcdef',
      background: '#112233',
    });
    service.writeSystemTheme('white');

    expect(service.readDefaultTerminalTheme()).toEqual({
      foreground: '#abcdef',
      background: '#112233',
      cursor: '#abcdef',
    });
    expect(service.readSystemTheme()).toBe('white');
  });

  it('persists the terminal ansi palette preference', () => {
    expect(service.readTerminalAnsiPalette()).toBe('auto');

    service.writeTerminalAnsiPalette('dracula');
    expect(service.readTerminalAnsiPalette()).toBe('dracula');
  });

  it('migrates legacy system theme ids to the new palette', () => {
    localStorage.setItem('nthterm.preferences.systemTheme', 'slate');
    expect(service.readSystemTheme()).toBe('white');

    localStorage.setItem('nthterm.preferences.systemTheme', 'ember');
    expect(service.readSystemTheme()).toBe('coffee');
  });
});
