import {
  normalizeHexColor,
  normalizeTerminalTheme,
  resolveTerminalTheme,
  toXtermTheme,
} from './terminal-theme.util';
import { DEFAULT_TERMINAL_THEME } from '../models/terminal-theme.models';

describe('terminal-theme.util', () => {
  it('normalizes short hex colors and invalid values', () => {
    expect(normalizeHexColor('#abc', '#000000')).toBe('#aabbcc');
    expect(normalizeHexColor('bad', '#123456')).toBe('#123456');
  });

  it('resolves terminal themes against the app default', () => {
    expect(resolveTerminalTheme(null, DEFAULT_TERMINAL_THEME)).toEqual(DEFAULT_TERMINAL_THEME);
    expect(
      resolveTerminalTheme({ foreground: '#ffffff', background: '#101010' }, DEFAULT_TERMINAL_THEME)
    ).toEqual({
      foreground: '#ffffff',
      background: '#101010',
      cursor: '#ffffff',
    });
  });

  it('maps terminal themes to xterm options', () => {
    const theme = normalizeTerminalTheme({
      foreground: '#eeeeee',
      background: '#111111',
    });

    expect(toXtermTheme(theme).background).toBe('#111111');
    expect(toXtermTheme(theme).foreground).toBe('#eeeeee');
    expect(toXtermTheme(theme, 'dracula').magenta).toBe('#ff79c6');
    expect(toXtermTheme(theme, 'auto').green).toBe('#23d18b');
  });
});
