import { Injectable } from '@angular/core';

import {
  DEFAULT_TERMINAL_ANSI_PALETTE,
  DEFAULT_TERMINAL_THEME,
  SystemThemeId,
  TerminalAnsiPaletteId,
  TerminalColorTheme,
} from '../models/terminal-theme.models';
import { isTerminalAnsiPaletteId } from '../terminal/terminal-ansi-palettes';
import { normalizeTerminalTheme } from '../terminal/terminal-theme.util';

const BOTTOM_PANEL_PREFERENCE_KEY = 'nthterm.preferences.bottomPanel.visible';
const BOTTOM_PANEL_HEIGHT_PREFERENCE_KEY = 'nthterm.preferences.bottomPanel.height';
const NEW_SESSION_START_MODE_PREFERENCE_KEY = 'nthterm.preferences.newSession.startMode';
const NEW_SESSION_CUSTOM_PATH_PREFERENCE_KEY = 'nthterm.preferences.newSession.customPath';
const DEFAULT_SHELL_PREFERENCE_KEY = 'nthterm.preferences.defaultShell';
const DEFAULT_TERMINAL_THEME_PREFERENCE_KEY = 'nthterm.preferences.defaultTerminalTheme';
const TERMINAL_ANSI_PALETTE_PREFERENCE_KEY = 'nthterm.preferences.terminalAnsiPalette';
const SYSTEM_THEME_PREFERENCE_KEY = 'nthterm.preferences.systemTheme';

export type DefaultShellPreference = '' | 'powershell' | 'cmd' | 'bash' | 'zsh';
const DEFAULT_BOTTOM_PANEL_HEIGHT = 280;
const MIN_BOTTOM_PANEL_HEIGHT = 160;
const MAX_BOTTOM_PANEL_HEIGHT = 520;

export type NewSessionStartMode = 'focused-tab' | 'home' | 'custom';

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  readBottomPanelVisible(): boolean {
    try {
      return localStorage.getItem(BOTTOM_PANEL_PREFERENCE_KEY) !== 'false';
    } catch {
      return true;
    }
  }

  writeBottomPanelVisible(visible: boolean): void {
    try {
      localStorage.setItem(BOTTOM_PANEL_PREFERENCE_KEY, String(visible));
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readBottomPanelHeight(): number {
    try {
      const raw = localStorage.getItem(BOTTOM_PANEL_HEIGHT_PREFERENCE_KEY);
      const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_BOTTOM_PANEL_HEIGHT;
      return this.clampBottomPanelHeight(parsed);
    } catch {
      return DEFAULT_BOTTOM_PANEL_HEIGHT;
    }
  }

  writeBottomPanelHeight(height: number): void {
    try {
      localStorage.setItem(
        BOTTOM_PANEL_HEIGHT_PREFERENCE_KEY,
        String(this.clampBottomPanelHeight(height))
      );
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  clampBottomPanelHeight(height: number): number {
    if (Number.isNaN(height)) {
      return DEFAULT_BOTTOM_PANEL_HEIGHT;
    }

    return Math.max(MIN_BOTTOM_PANEL_HEIGHT, Math.min(MAX_BOTTOM_PANEL_HEIGHT, Math.round(height)));
  }

  readNewSessionStartMode(): NewSessionStartMode {
    try {
      const stored = localStorage.getItem(NEW_SESSION_START_MODE_PREFERENCE_KEY);
      return this.isNewSessionStartMode(stored) ? stored : 'focused-tab';
    } catch {
      return 'focused-tab';
    }
  }

  writeNewSessionStartMode(mode: NewSessionStartMode): void {
    try {
      localStorage.setItem(NEW_SESSION_START_MODE_PREFERENCE_KEY, mode);
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readNewSessionCustomPath(): string {
    try {
      return localStorage.getItem(NEW_SESSION_CUSTOM_PATH_PREFERENCE_KEY)?.trim() || '';
    } catch {
      return '';
    }
  }

  writeNewSessionCustomPath(path: string): void {
    try {
      localStorage.setItem(NEW_SESSION_CUSTOM_PATH_PREFERENCE_KEY, path.trim());
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readDefaultShell(): DefaultShellPreference {
    try {
      const stored = localStorage.getItem(DEFAULT_SHELL_PREFERENCE_KEY);
      return this.isDefaultShell(stored) ? stored : '';
    } catch {
      return '';
    }
  }

  writeDefaultShell(shell: DefaultShellPreference): void {
    try {
      localStorage.setItem(DEFAULT_SHELL_PREFERENCE_KEY, shell);
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readDefaultTerminalTheme(): TerminalColorTheme {
    try {
      const stored = localStorage.getItem(DEFAULT_TERMINAL_THEME_PREFERENCE_KEY);
      if (!stored) {
        return { ...DEFAULT_TERMINAL_THEME };
      }

      return normalizeTerminalTheme(JSON.parse(stored) as Partial<TerminalColorTheme>);
    } catch {
      return { ...DEFAULT_TERMINAL_THEME };
    }
  }

  writeDefaultTerminalTheme(theme: TerminalColorTheme): void {
    try {
      localStorage.setItem(
        DEFAULT_TERMINAL_THEME_PREFERENCE_KEY,
        JSON.stringify(normalizeTerminalTheme(theme))
      );
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readTerminalAnsiPalette(): TerminalAnsiPaletteId {
    try {
      const stored = localStorage.getItem(TERMINAL_ANSI_PALETTE_PREFERENCE_KEY);
      return isTerminalAnsiPaletteId(stored) ? stored : DEFAULT_TERMINAL_ANSI_PALETTE;
    } catch {
      return DEFAULT_TERMINAL_ANSI_PALETTE;
    }
  }

  writeTerminalAnsiPalette(paletteId: TerminalAnsiPaletteId): void {
    try {
      localStorage.setItem(TERMINAL_ANSI_PALETTE_PREFERENCE_KEY, paletteId);
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  readSystemTheme(): SystemThemeId {
    try {
      const stored = localStorage.getItem(SYSTEM_THEME_PREFERENCE_KEY);
      const migrated = this.migrateSystemTheme(stored);
      return this.isSystemTheme(migrated) ? migrated : 'midnight';
    } catch {
      return 'midnight';
    }
  }

  writeSystemTheme(theme: SystemThemeId): void {
    try {
      localStorage.setItem(SYSTEM_THEME_PREFERENCE_KEY, theme);
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  private isSystemTheme(value: string | null): value is SystemThemeId {
    return value === 'midnight' || value === 'coffee' || value === 'white';
  }

  private migrateSystemTheme(value: string | null): string | null {
    if (value === 'slate') {
      return 'white';
    }

    if (value === 'ember') {
      return 'coffee';
    }

    return value;
  }

  private isDefaultShell(value: string | null): value is DefaultShellPreference {
    return value === '' || value === 'powershell' || value === 'cmd' || value === 'bash' || value === 'zsh';
  }

  private isNewSessionStartMode(value: string | null): value is NewSessionStartMode {
    return value === 'focused-tab' || value === 'home' || value === 'custom';
  }
}
