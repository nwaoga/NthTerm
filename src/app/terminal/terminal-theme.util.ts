import { ITheme } from '@xterm/xterm';

import {
  DEFAULT_TERMINAL_THEME,
  TerminalAnsiPaletteId,
  TerminalColorTheme,
} from '../models/terminal-theme.models';
import { resolveTerminalAnsiPalette } from './terminal-ansi-palettes';

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

export function normalizeTerminalTheme(
  theme: Partial<TerminalColorTheme> | null | undefined,
  fallback: TerminalColorTheme = DEFAULT_TERMINAL_THEME
): TerminalColorTheme {
  const foreground = normalizeHexColor(theme?.foreground || '', fallback.foreground);
  const background = normalizeHexColor(theme?.background || '', fallback.background);

  return {
    foreground,
    background,
    cursor: normalizeHexColor(theme?.cursor || '', foreground),
  };
}

export function resolveTerminalTheme(
  terminalTheme: TerminalColorTheme | null | undefined,
  defaultTheme: TerminalColorTheme
): TerminalColorTheme {
  if (!terminalTheme) {
    return normalizeTerminalTheme(defaultTheme);
  }

  return normalizeTerminalTheme(terminalTheme, defaultTheme);
}

export function toXtermTheme(
  theme: TerminalColorTheme,
  paletteId?: TerminalAnsiPaletteId
): ITheme {
  const normalized = normalizeTerminalTheme(theme);
  const ansiPalette = resolveTerminalAnsiPalette(paletteId, normalized.background);

  return {
    ...ansiPalette,
    background: normalized.background,
    foreground: normalized.foreground,
    cursor: normalized.cursor,
    selectionBackground: blendHex(normalized.background, normalized.foreground, 0.35),
  };
}

export function themesEqual(
  left: TerminalColorTheme | null | undefined,
  right: TerminalColorTheme | null | undefined
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const normalizedLeft = normalizeTerminalTheme(left);
  const normalizedRight = normalizeTerminalTheme(right);
  return (
    normalizedLeft.foreground === normalizedRight.foreground &&
    normalizedLeft.background === normalizedRight.background &&
    normalizedLeft.cursor === normalizedRight.cursor
  );
}

function blendHex(background: string, foreground: string, ratio: number): string {
  const bg = parseHex(background);
  const fg = parseHex(foreground);
  const mix = (channel: 'r' | 'g' | 'b') =>
    Math.round(bg[channel] * (1 - ratio) + fg[channel] * ratio);

  return `#${toHex(mix('r'))}${toHex(mix('g'))}${toHex(mix('b'))}`;
}

function parseHex(value: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(value, '#000000').slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, '0');
}
