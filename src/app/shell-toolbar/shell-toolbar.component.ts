import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { UtilityPanelId } from '../models';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-shell-toolbar',
  templateUrl: './shell-toolbar.component.html',
})
export class ShellToolbarComponent {
  @Output() readonly createTabRequested = new EventEmitter<void>();
  @Output() readonly layoutModeChange = new EventEmitter<'grid-2' | 'grid-2x2'>();
  @Output() readonly globalSearchRequested = new EventEmitter<void>();
  @Output() readonly commandPaletteRequested = new EventEmitter<void>();
  @Output() readonly utilityPanelOpen = new EventEmitter<UtilityPanelId>();
  @Output() readonly viewMenuToggle = new EventEmitter<MouseEvent>();

  @Input({ required: true }) viewMenuOpen = false;

  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly isWindows = this.detectWindows();

  protected getWorkspaceSummary(): string {
    const focusedTab = this.ws.getFocusedTab?.();
    const tabCount = this.ws.runtimeTabs?.length || 0;
    const tabLabel = tabCount === 1 ? '1 tab' : `${tabCount} tabs`;

    if (!focusedTab) {
      return `${tabLabel} • workspace shell`;
    }

    return `${tabLabel} • ${focusedTab.title}`;
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
