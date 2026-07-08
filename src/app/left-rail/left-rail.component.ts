import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WorkspaceListItem } from '../models';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-left-rail',
  imports: [FormsModule],
  templateUrl: './left-rail.component.html',
})
export class LeftRailComponent {
  @Output() readonly newSessionRequested = new EventEmitter<void>();
  @Output() readonly workspaceSelected = new EventEmitter<string>();
  @Output() readonly workspaceRenameCommitted = new EventEmitter<string>();
  @Output() readonly workspaceDeleteRequested = new EventEmitter<WorkspaceListItem>();

  protected readonly ws = inject(WorkspaceRuntimeService);

  protected selectWorkspace(workspaceId: string): void {
    this.workspaceSelected.emit(workspaceId);
  }

  protected startRenameWorkspace(workspace: WorkspaceListItem, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.ws.startRenameWorkspace(workspace);
  }

  protected cancelRenameWorkspace(): void {
    this.ws.cancelRenameWorkspace();
  }

  protected commitRenameWorkspace(workspaceId: string): void {
    this.workspaceRenameCommitted.emit(workspaceId);
  }

  protected deleteWorkspace(workspace: WorkspaceListItem, event: MouseEvent): void {
    event.stopPropagation();
    this.workspaceDeleteRequested.emit(workspace);
  }

  protected createBlankWorkspace(): void {
    this.newSessionRequested.emit();
  }

  protected isWorkspaceActive(workspace: WorkspaceListItem): boolean {
    return this.ws.isWorkspaceActive(workspace);
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
}
