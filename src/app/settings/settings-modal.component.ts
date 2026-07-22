import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  SYSTEM_THEMES,
  SystemThemeId,
  TERMINAL_ANSI_PALETTE_OPTIONS,
  TerminalAnsiPaletteId,
  ShellOption,
  buildShellOptions,
  isShellId,
} from '../models';
import { resolveHostPlatform } from '../platform/host-platform';
import { DefaultShellPreference, NewSessionStartMode } from '../preferences/app-preferences.service';

@Component({
  selector: 'app-settings-modal',
  imports: [FormsModule],
  templateUrl: './settings-modal.component.html',
})
export class SettingsModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) utilityPanelVisible = true;
  @Input() newSessionStartMode: NewSessionStartMode = 'focused-tab';
  @Input() newSessionCustomPath = '';
  @Input() homeDirectory = '';
  @Input() defaultShell: DefaultShellPreference = '';
  @Input() systemTheme: SystemThemeId = 'midnight';
  @Input() defaultTerminalForeground = '#d8e1e8';
  @Input() defaultTerminalBackground = '#0d1320';
  @Input() terminalAnsiPalette: TerminalAnsiPaletteId = 'auto';
  @Input() shellOptions: ShellOption[] = buildShellOptions([], resolveHostPlatform());

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly utilityPanelPreferenceChange = new EventEmitter<boolean>();
  @Output() readonly newSessionStartModeChange = new EventEmitter<NewSessionStartMode>();
  @Output() readonly newSessionCustomPathChange = new EventEmitter<string>();
  @Output() readonly defaultShellChange = new EventEmitter<DefaultShellPreference>();
  @Output() readonly systemThemeChange = new EventEmitter<SystemThemeId>();
  @Output() readonly defaultTerminalForegroundChange = new EventEmitter<string>();
  @Output() readonly defaultTerminalBackgroundChange = new EventEmitter<string>();
  @Output() readonly terminalAnsiPaletteChange = new EventEmitter<TerminalAnsiPaletteId>();

  protected readonly systemThemes = SYSTEM_THEMES;
  protected readonly terminalAnsiPaletteOptions = TERMINAL_ANSI_PALETTE_OPTIONS;
  protected readonly newSessionStartOptions: Array<{
    value: NewSessionStartMode;
    label: string;
    hint: string;
  }> = [
    {
      value: 'focused-tab',
      label: 'Focused terminal',
      hint: 'Start in the active terminal directory when one is available.',
    },
    {
      value: 'home',
      label: 'Home directory',
      hint: 'Always start from your OS home folder.',
    },
    {
      value: 'custom',
      label: 'Custom path',
      hint: 'Use the same saved directory for every new workspace.',
    },
  ];

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected setUtilityPanelPreference(visible: boolean): void {
    this.utilityPanelPreferenceChange.emit(visible);
  }

  protected setNewSessionStartMode(value: string): void {
    if (value === 'focused-tab' || value === 'home' || value === 'custom') {
      this.newSessionStartModeChange.emit(value);
    }
  }

  protected setNewSessionCustomPath(value: string): void {
    this.newSessionCustomPathChange.emit(value);
  }

  protected setDefaultShell(value: string): void {
    if (isShellId(value)) {
      this.defaultShellChange.emit(value);
    }
  }

  protected setSystemTheme(value: string): void {
    if (value === 'midnight' || value === 'coffee' || value === 'white') {
      this.systemThemeChange.emit(value);
    }
  }

  protected setDefaultTerminalForeground(value: string): void {
    this.defaultTerminalForegroundChange.emit(value);
  }

  protected setDefaultTerminalBackground(value: string): void {
    this.defaultTerminalBackgroundChange.emit(value);
  }

  protected setTerminalAnsiPalette(value: string): void {
    if (
      value === 'auto' ||
      value === 'vscode-dark' ||
      value === 'vscode-light' ||
      value === 'dracula' ||
      value === 'monokai' ||
      value === 'one-dark' ||
      value === 'solarized-dark' ||
      value === 'nord'
    ) {
      this.terminalAnsiPaletteChange.emit(value);
    }
  }

  protected getNewSessionStartHint(): string {
    if (this.newSessionStartMode === 'home') {
      return this.homeDirectory || 'Uses your home directory when NthTerm is running on desktop.';
    }

    if (this.newSessionStartMode === 'custom') {
      return this.newSessionCustomPath.trim() || 'Enter a directory to use for new workspaces.';
    }

    return 'Falls back to the current workspace directory when no tab is focused.';
  }
}
