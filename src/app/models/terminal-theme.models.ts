export interface TerminalColorTheme {
  foreground: string;
  background: string;
  cursor?: string;
}

export const DEFAULT_TERMINAL_THEME: TerminalColorTheme = {
  foreground: '#d8e1e8',
  background: '#0d1320',
  cursor: '#7dd3fc',
};

export type SystemThemeId = 'midnight' | 'coffee' | 'white';

export interface SystemThemeDefinition {
  id: SystemThemeId;
  label: string;
  description: string;
}

export const SYSTEM_THEMES: SystemThemeDefinition[] = [
  {
    id: 'midnight',
    label: 'Midnight (Dark)',
    description: 'The original NthTerm violet workspace chrome.',
  },
  {
    id: 'coffee',
    label: 'Coffee (Light)',
    description: 'Warm cream panels with brown accents.',
  },
  {
    id: 'white',
    label: 'White (Light)',
    description: 'Clean white workspace with blue accents.',
  },
];

export type TerminalAnsiPaletteId =
  | 'auto'
  | 'vscode-dark'
  | 'vscode-light'
  | 'dracula'
  | 'monokai'
  | 'one-dark'
  | 'solarized-dark'
  | 'nord';

export interface TerminalAnsiPaletteOption {
  id: TerminalAnsiPaletteId;
  label: string;
}

export const TERMINAL_ANSI_PALETTE_OPTIONS: TerminalAnsiPaletteOption[] = [
  { id: 'auto', label: 'Auto (match background)' },
  { id: 'vscode-dark', label: 'VS Code Dark+' },
  { id: 'vscode-light', label: 'VS Code Light+' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'one-dark', label: 'One Dark' },
  { id: 'solarized-dark', label: 'Solarized Dark' },
  { id: 'nord', label: 'Nord' },
];

export const DEFAULT_TERMINAL_ANSI_PALETTE: TerminalAnsiPaletteId = 'auto';
