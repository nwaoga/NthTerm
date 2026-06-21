import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SessionListItem, TemplateListItem, WORKSPACE_TEMPLATES } from '../models';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-left-rail',
  imports: [FormsModule],
  templateUrl: './left-rail.component.html',
})
export class LeftRailComponent {
  @Input({ required: true }) preferencesOpen = false;
  @Input({ required: true }) utilityPanelVisible = true;

  @Output() readonly preferencesToggle = new EventEmitter<void>();
  @Output() readonly utilityPanelPreferenceChange = new EventEmitter<boolean>();
  @Output() readonly workspaceSelected = new EventEmitter<string>();
  @Output() readonly templateSelected = new EventEmitter<TemplateListItem>();
  @Output() readonly sessionRenameCommitted = new EventEmitter<string>();
  @Output() readonly sessionDeleteRequested = new EventEmitter<SessionListItem>();

  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly templates = WORKSPACE_TEMPLATES;

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
