import { Injectable } from '@angular/core';

const BOTTOM_PANEL_PREFERENCE_KEY = 'nthterm.preferences.bottomPanel.visible';

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
}
