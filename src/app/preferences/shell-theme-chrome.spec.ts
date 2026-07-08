import { getShellTitleBarTheme, SHELL_TITLE_BAR_HEIGHT } from './shell-theme-chrome';

describe('shell-theme-chrome', () => {
  it('defines a title bar height that matches the shell toolbar', () => {
    expect(SHELL_TITLE_BAR_HEIGHT).toBe(66);
  });

  it('returns light chrome colors for coffee and white themes', () => {
    expect(getShellTitleBarTheme('coffee').color).toBe('#faf6f0');
    expect(getShellTitleBarTheme('coffee').symbolColor).toBe('#4a4036');
    expect(getShellTitleBarTheme('white').color).toBe('#ffffff');
  });

  it('returns dark chrome colors for midnight', () => {
    expect(getShellTitleBarTheme('midnight').windowBackground).toBe('#090d16');
    expect(getShellTitleBarTheme('midnight').symbolColor).toBe('#dbe7f5');
  });
});
