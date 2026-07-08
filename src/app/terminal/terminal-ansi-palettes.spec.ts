import {
  DRACULA_ANSI,
  isDarkBackground,
  isTerminalAnsiPaletteId,
  resolveTerminalAnsiPalette,
  VS_CODE_DARK_ANSI,
  VS_CODE_LIGHT_ANSI,
} from './terminal-ansi-palettes';

describe('terminal-ansi-palettes', () => {
  it('selects vscode palettes automatically from the terminal background', () => {
    expect(resolveTerminalAnsiPalette('auto', '#0d1320')).toBe(VS_CODE_DARK_ANSI);
    expect(resolveTerminalAnsiPalette('auto', '#ffffff')).toBe(VS_CODE_LIGHT_ANSI);
    expect(isDarkBackground('#0d1320')).toBeTrue();
    expect(isDarkBackground('#ffffff')).toBeFalse();
  });

  it('returns named palette presets', () => {
    expect(resolveTerminalAnsiPalette('dracula', '#ffffff')).toBe(DRACULA_ANSI);
    expect(resolveTerminalAnsiPalette('one-dark', '#ffffff').green).toBe('#98c379');
  });

  it('validates palette ids', () => {
    expect(isTerminalAnsiPaletteId('nord')).toBeTrue();
    expect(isTerminalAnsiPaletteId('invalid')).toBeFalse();
  });
});
