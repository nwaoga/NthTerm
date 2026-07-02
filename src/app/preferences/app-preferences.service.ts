import { Injectable } from '@angular/core';

const BOTTOM_PANEL_PREFERENCE_KEY = 'nthterm.preferences.bottomPanel.visible';
const BOTTOM_PANEL_HEIGHT_PREFERENCE_KEY = 'nthterm.preferences.bottomPanel.height';
const NEW_SESSION_START_MODE_PREFERENCE_KEY = 'nthterm.preferences.newSession.startMode';
const NEW_SESSION_CUSTOM_PATH_PREFERENCE_KEY = 'nthterm.preferences.newSession.customPath';
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

  private isNewSessionStartMode(value: string | null): value is NewSessionStartMode {
    return value === 'focused-tab' || value === 'home' || value === 'custom';
  }
}
