import { SystemThemeId } from '../models/terminal-theme.models';

export const SHELL_TITLE_BAR_HEIGHT = 66;

export interface ShellTitleBarTheme {
  windowBackground: string;
  color: string;
  symbolColor: string;
  height: number;
}

export const SHELL_TITLE_BAR_THEMES: Record<SystemThemeId, ShellTitleBarTheme> = {
  midnight: {
    windowBackground: '#00000000',
    // Transparent overlay so acrylic/glass toolbar shows through the caption buttons.
    color: '#00000000',
    symbolColor: '#dbe7f5',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
  coffee: {
    windowBackground: '#00000000',
    color: '#00000000',
    symbolColor: '#4a4036',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
  white: {
    windowBackground: '#00000000',
    color: '#00000000',
    symbolColor: '#334155',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
};

export function getShellTitleBarTheme(themeId: SystemThemeId): ShellTitleBarTheme {
  return SHELL_TITLE_BAR_THEMES[themeId];
}
