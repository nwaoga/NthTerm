import { Component, EventEmitter, HostListener, Output, inject } from '@angular/core';

import { DefaultShellPreference } from '../preferences/app-preferences.service';
import { HostPlatformId, resolveHostPlatform } from '../platform/host-platform';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { MAX_TERMINALS_PER_WORKSPACE } from '../workspace/workspace-snapshot';

@Component({
  selector: 'app-shell-toolbar',
  templateUrl: './shell-toolbar.component.html',
})
export class ShellToolbarComponent {
  @Output() readonly createTerminalRequested = new EventEmitter<DefaultShellPreference | undefined>();
  @Output() readonly commandPaletteRequested = new EventEmitter<void>();
  @Output() readonly settingsRequested = new EventEmitter<void>();

  protected shellMenuOpen = false;
  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly hostPlatform: HostPlatformId = resolveHostPlatform();

  @HostListener('document:click')
  protected closeShellMenu(): void {
    this.shellMenuOpen = false;
  }

  protected getWorkspaceSummary(): string {
    const terminalCount = this.getTerminalCount();
    return `${terminalCount}/${MAX_TERMINALS_PER_WORKSPACE} terminal${terminalCount === 1 ? '' : 's'}`;
  }

  protected getFocusedContextTitle(): string {
    return this.ws.workspaceName || this.ws.selectedWorkspace || 'No workspace selected';
  }

  protected canAddTerminal(): boolean {
    return this.getTerminalCount() < MAX_TERMINALS_PER_WORKSPACE;
  }

  protected getTerminalActionLabel(): string {
    return this.getTerminalCount() > 0 ? 'Add Terminal' : 'Start Terminal';
  }

  protected getShellOptions() {
    return this.ws.getShellOptions();
  }

  protected createTerminal(shell?: DefaultShellPreference): void {
    this.shellMenuOpen = false;
    this.createTerminalRequested.emit(shell);
  }

  protected toggleShellMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.shellMenuOpen = !this.shellMenuOpen;
  }

  protected openCommandPalette(): void {
    this.commandPaletteRequested.emit();
  }

  protected openSettings(): void {
    this.settingsRequested.emit();
  }

  private getTerminalCount(): number {
    if (typeof this.ws.getActiveTabTerminals === 'function') {
      return this.ws.getActiveTabTerminals().length;
    }

    return this.ws.terminals?.length || 0;
  }
}
