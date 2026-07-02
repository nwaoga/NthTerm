import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SessionListItem, TemplateListItem, WORKSPACE_TEMPLATES } from '../models';
import { NewSessionStartMode } from '../preferences/app-preferences.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-left-rail',
  imports: [FormsModule],
  templateUrl: './left-rail.component.html',
})
export class LeftRailComponent {
  @Input({ required: true }) preferencesOpen = false;
  @Input({ required: true }) utilityPanelVisible = true;
  @Input() newSessionStartMode: NewSessionStartMode = 'focused-tab';
  @Input() newSessionCustomPath = '';
  @Input() homeDirectory = '';

  @Output() readonly preferencesToggle = new EventEmitter<void>();
  @Output() readonly utilityPanelPreferenceChange = new EventEmitter<boolean>();
  @Output() readonly newSessionRequested = new EventEmitter<void>();
  @Output() readonly newSessionStartModeChange = new EventEmitter<NewSessionStartMode>();
  @Output() readonly newSessionCustomPathChange = new EventEmitter<string>();
  @Output() readonly workspaceSelected = new EventEmitter<string>();
  @Output() readonly templateSelected = new EventEmitter<TemplateListItem>();
  @Output() readonly sessionRenameCommitted = new EventEmitter<string>();
  @Output() readonly sessionDeleteRequested = new EventEmitter<SessionListItem>();

  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly templates = WORKSPACE_TEMPLATES;
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
      hint: 'Use the same saved directory for every new session.',
    },
  ];

  protected togglePreferences(): void {
    this.preferencesToggle.emit();
  }

  protected setUtilityPanelPreference(visible: boolean): void {
    this.utilityPanelPreferenceChange.emit(visible);
  }

  protected selectWorkspace(workspaceId: string): void {
    this.workspaceSelected.emit(workspaceId);
  }

  protected startRenameSession(session: SessionListItem, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.ws.startRenameSession(session);
  }

  protected cancelRenameSession(): void {
    this.ws.cancelRenameSession();
  }

  protected commitRenameSession(sessionId: string): void {
    this.sessionRenameCommitted.emit(sessionId);
  }

  protected deleteSession(session: SessionListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.sessionDeleteRequested.emit(session);
  }

  protected createWorkspaceFromTemplate(template: TemplateListItem): void {
    this.templateSelected.emit(template);
  }

  protected createBlankWorkspace(): void {
    this.newSessionRequested.emit();
  }

  protected setNewSessionStartMode(value: string): void {
    if (value === 'focused-tab' || value === 'home' || value === 'custom') {
      this.newSessionStartModeChange.emit(value);
    }
  }

  protected setNewSessionCustomPath(value: string): void {
    this.newSessionCustomPathChange.emit(value);
  }

  protected getNewSessionStartHint(): string {
    if (this.newSessionStartMode === 'home') {
      return this.homeDirectory || 'Uses your home directory when NthTerm is running on desktop.';
    }

    if (this.newSessionStartMode === 'custom') {
      return this.newSessionCustomPath.trim() || 'Enter a directory to use for new sessions.';
    }

    return 'Falls back to the current workspace directory when no tab is focused.';
  }

  protected isSessionActive(session: SessionListItem): boolean {
    return this.ws.isSessionActive(session);
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByName(_index: number, item: { name: string }): string {
    return item.name;
  }
}
