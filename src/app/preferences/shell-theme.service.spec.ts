import { TestBed } from '@angular/core/testing';

import { getShellTitleBarTheme } from './shell-theme-chrome';
import { ShellThemeService } from './shell-theme.service';

describe('ShellThemeService', () => {
  let service: ShellThemeService;
  let applyTitleBarTheme: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShellThemeService);
    document.documentElement.removeAttribute('data-shell-theme');
    document.documentElement.removeAttribute('data-shell-theme-mode');
    applyTitleBarTheme = jasmine.createSpy('applyTitleBarTheme');
    window.nthTermDesktop = {
      app: {
        quitReady: async () => undefined,
        onBeforeQuit: () => () => undefined,
        applyTitleBarTheme,
      },
    };
  });

  afterEach(() => {
    delete window.nthTermDesktop;
  });

  it('applies the midnight system theme to the document root', () => {
    service.apply('midnight');

    expect(document.documentElement.getAttribute('data-shell-theme')).toBe('midnight');
    expect(document.documentElement.getAttribute('data-shell-theme-mode')).toBe('dark');
    expect(applyTitleBarTheme).toHaveBeenCalledWith(getShellTitleBarTheme('midnight'));
  });

  it('applies light mode for coffee and white themes', () => {
    service.apply('coffee');
    expect(document.documentElement.getAttribute('data-shell-theme-mode')).toBe('light');
    expect(applyTitleBarTheme).toHaveBeenCalledWith(getShellTitleBarTheme('coffee'));

    service.apply('white');
    expect(document.documentElement.getAttribute('data-shell-theme')).toBe('white');
    expect(document.documentElement.getAttribute('data-shell-theme-mode')).toBe('light');
    expect(applyTitleBarTheme).toHaveBeenCalledWith(getShellTitleBarTheme('white'));
  });
});
