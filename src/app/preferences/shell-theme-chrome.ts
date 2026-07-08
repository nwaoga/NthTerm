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
    windowBackground: '#090d16',
    color: '#151726',
    symbolColor: '#dbe7f5',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
  coffee: {
    windowBackground: '#e8e0d4',
    color: '#faf6f0',
    symbolColor: '#4a4036',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
  white: {
    windowBackground: '#eef1f6',
    color: '#ffffff',
    symbolColor: '#334155',
    height: SHELL_TITLE_BAR_HEIGHT,
  },
};

export function getShellTitleBarTheme(themeId: SystemThemeId): ShellTitleBarTheme {
  return SHELL_TITLE_BAR_THEMES[themeId];
}
