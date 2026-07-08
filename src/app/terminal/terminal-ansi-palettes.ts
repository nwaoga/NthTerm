import { ITheme } from '@xterm/xterm';

import {
  DEFAULT_TERMINAL_ANSI_PALETTE,
  TerminalAnsiPaletteId,
} from '../models/terminal-theme.models';

export type TerminalAnsiPalette = Pick<
  ITheme,
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'
>;

/** VS Code Dark+ inspired ANSI palette for syntax-style terminal output. */
export const VS_CODE_DARK_ANSI: TerminalAnsiPalette = {
  black: '#000000',
  red: '#f14c4c',
  green: '#23d18b',
  yellow: '#f5f543',
  blue: '#3b8eea',
  magenta: '#d670d6',
  cyan: '#29b8db',
  white: '#cccccc',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
};

/** VS Code Light+ inspired ANSI palette for light terminal backgrounds. */
export const VS_CODE_LIGHT_ANSI: TerminalAnsiPalette = {
  black: '#000000',
  red: '#cd3131',
  green: '#00bc00',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

export const DRACULA_ANSI: TerminalAnsiPalette = {
  black: '#21222c',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#6272a4',
  brightRed: '#ff6e6e',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightMagenta: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
};

export const MONOKAI_ANSI: TerminalAnsiPalette = {
  black: '#272822',
  red: '#f92672',
  green: '#a6e22e',
  yellow: '#f4bf75',
  blue: '#66d9ef',
  magenta: '#ae81ff',
  cyan: '#a1efe4',
  white: '#f8f8f2',
  brightBlack: '#75715e',
  brightRed: '#f92672',
  brightGreen: '#a6e22e',
  brightYellow: '#f4bf75',
  brightBlue: '#66d9ef',
  brightMagenta: '#ae81ff',
  brightCyan: '#a1efe4',
  brightWhite: '#f9f8f5',
};

export const ONE_DARK_ANSI: TerminalAnsiPalette = {
  black: '#000000',
  red: '#e06c75',
  green: '#98c379',
  yellow: '#e5c07b',
  blue: '#61afef',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#abb2bf',
  brightBlack: '#5c6370',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
};

export const SOLARIZED_DARK_ANSI: TerminalAnsiPalette = {
  black: '#073642',
  red: '#dc322f',
  green: '#859900',
  yellow: '#b58900',
  blue: '#268bd2',
  magenta: '#d33682',
  cyan: '#2aa198',
  white: '#eee8d5',
  brightBlack: '#002b36',
  brightRed: '#cb4b16',
  brightGreen: '#586e75',
  brightYellow: '#657b83',
  brightBlue: '#839496',
  brightMagenta: '#6c71c4',
  brightCyan: '#93a1a1',
  brightWhite: '#fdf6e3',
};

export const NORD_ANSI: TerminalAnsiPalette = {
  black: '#3b4252',
  red: '#bf616a',
  green: '#a3be8c',
  yellow: '#ebcb8b',
  blue: '#81a1c1',
  magenta: '#b48ead',
  cyan: '#88c0d0',
  white: '#e5e9f0',
  brightBlack: '#4c566a',
  brightRed: '#bf616a',
  brightGreen: '#a3be8c',
  brightYellow: '#ebcb8b',
  brightBlue: '#81a1c1',
  brightMagenta: '#b48ead',
  brightCyan: '#8fbcbb',
  brightWhite: '#eceff4',
};

const TERMINAL_ANSI_PALETTE_MAP: Record<Exclude<TerminalAnsiPaletteId, 'auto'>, TerminalAnsiPalette> = {
  'vscode-dark': VS_CODE_DARK_ANSI,
  'vscode-light': VS_CODE_LIGHT_ANSI,
  dracula: DRACULA_ANSI,
  monokai: MONOKAI_ANSI,
  'one-dark': ONE_DARK_ANSI,
  'solarized-dark': SOLARIZED_DARK_ANSI,
  nord: NORD_ANSI,
};

export function resolveTerminalAnsiPalette(
  paletteId: TerminalAnsiPaletteId = DEFAULT_TERMINAL_ANSI_PALETTE,
  background = '#0d1320'
): TerminalAnsiPalette {
  const resolvedId =
    paletteId === 'auto'
      ? isDarkBackground(background)
        ? 'vscode-dark'
        : 'vscode-light'
      : paletteId;

  return TERMINAL_ANSI_PALETTE_MAP[resolvedId] ?? VS_CODE_DARK_ANSI;
}

export function isTerminalAnsiPaletteId(value: string | null | undefined): value is TerminalAnsiPaletteId {
  return (
    value === 'auto' ||
    value === 'vscode-dark' ||
    value === 'vscode-light' ||
    value === 'dracula' ||
    value === 'monokai' ||
    value === 'one-dark' ||
    value === 'solarized-dark' ||
    value === 'nord'
  );
}

export function isDarkBackground(background: string): boolean {
  const { r, g, b } = parseHexChannels(background);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function parseHexChannels(value: string): { r: number; g: number; b: number } {
  const normalized = value.trim().toLowerCase();
  const hex =
    normalized.length === 4
      ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
      : normalized;
  const channels = hex.slice(1);

  return {
    r: Number.parseInt(channels.slice(0, 2), 16),
    g: Number.parseInt(channels.slice(2, 4), 16),
    b: Number.parseInt(channels.slice(4, 6), 16),
  };
}
