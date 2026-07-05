import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';

import { SHELL_OPTIONS, UtilityPanelId } from '../models';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { AppPreferencesService, DefaultShellPreference } from '../preferences/app-preferences.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { MAX_TABS_PER_WORKSPACE, MAX_TERMINALS_PER_TAB } from '../workspace/workspace-snapshot';

@Component({
  selector: 'app-shell-toolbar',
  templateUrl: './shell-toolbar.component.html',
})
export class ShellToolbarComponent {
  @Output() readonly createTabRequested = new EventEmitter<void>();
  @Output() readonly createTerminalRequested = new EventEmitter<DefaultShellPreference>();
  @Output() readonly layoutModeChange = new EventEmitter<'grid-2' | 'grid-2x2'>();
  @Output() readonly globalSearchRequested = new EventEmitter<void>();
  @Output() readonly commandPaletteRequested = new EventEmitter<void>();
  @Output() readonly utilityPanelOpen = new EventEmitter<UtilityPanelId>();
  @Output() readonly viewMenuToggle = new EventEmitter<MouseEvent>();

  @Input({ required: true }) viewMenuOpen = false;

  protected shellMenuOpen = false;
  protected readonly shellOptions = SHELL_OPTIONS;
  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly preferences = inject(AppPreferencesService);
  protected readonly isWindows = this.detectWindows();

  @HostListener('document:click')
  protected closeShellMenu(): void {
    this.shellMenuOpen = false;
  }

  protected getWorkspaceSummary(): string {
    const focusedTab = this.ws.getFocusedTab?.();
    const tabCount = this.ws.runtimeTabs?.length || 0;
    const terminalCount = this.ws.getActiveTabTerminals?.().length || 0;
    const tabLabel = `${tabCount}/${MAX_TABS_PER_WORKSPACE} tabs`;

    if (!focusedTab) {
      return `${tabLabel} • workspace shell`;
    }

    return `${tabLabel} • ${focusedTab.title} • ${terminalCount} shell${terminalCount === 1 ? '' : 's'}`;
  }

  protected canAddTab(): boolean {
    return (this.ws.runtimeTabs?.length || 0) < MAX_TABS_PER_WORKSPACE;
  }

  protected canAddTerminal(): boolean {
    return (this.ws.getActiveTabTerminals?.().length || 0) < MAX_TERMINALS_PER_TAB;
  }

  protected createTerminal(shell: DefaultShellPreference = this.preferences.readDefaultShell()): void {
    this.shellMenuOpen = false;
    this.createTerminalRequested.emit(shell);
  }

  protected toggleShellMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.shellMenuOpen = !this.shellMenuOpen;
  }

  protected getLayoutLabel(): string {
    return this.ws.layoutMode === 'grid-2' ? '2-Up' : '2x2';
  }

  protected createTab(): void {
    this.createTabRequested.emit();
  }

  protected setLayoutMode(mode: 'grid-2' | 'grid-2x2'): void {
    this.layoutModeChange.emit(mode);
  }

  protected openGlobalSearch(): void {
    this.globalSearchRequested.emit();
  }

  protected openCommandPalette(): void {
    this.commandPaletteRequested.emit();
  }

  protected openUtilityPanel(tab: UtilityPanelId): void {
    this.utilityPanelOpen.emit(tab);
  }

  protected toggleViewMenu(event: MouseEvent): void {
    this.viewMenuToggle.emit(event);
  }

  private detectWindows(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const uaNavigator = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform =
      uaNavigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
    return /win/i.test(platform.toLowerCase());
  }
}
