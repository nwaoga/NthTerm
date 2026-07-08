import { Injectable } from '@angular/core';

import { SystemThemeId } from '../models/terminal-theme.models';
import { getShellTitleBarTheme } from './shell-theme-chrome';

@Injectable({ providedIn: 'root' })
export class ShellThemeService {
  apply(themeId: SystemThemeId): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-shell-theme', themeId);
    document.documentElement.setAttribute('data-shell-theme-mode', themeId === 'midnight' ? 'dark' : 'light');
    window.nthTermDesktop?.app?.applyTitleBarTheme?.(getShellTitleBarTheme(themeId));
  }
}
