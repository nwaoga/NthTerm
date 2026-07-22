import { Injectable, inject } from '@angular/core';

import { WorkspaceRuntimeService } from './workspace-runtime.service';
import {
  FOCUS_ZOOM_THRESHOLD,
  WorkspaceLayoutState,
  WorkspaceViewMode,
} from './workspace-layout.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceLayoutService {
  private readonly workspace = inject(WorkspaceRuntimeService);

  private state: WorkspaceLayoutState = {
    workspaceId: '',
    activeTerminalId: '',
    viewMode: 'focus',
    zoomLevel: 0,
  };

  private announcement = '';

  getSnapshot(): WorkspaceLayoutState {
    return { ...this.state };
  }

  get viewMode(): WorkspaceViewMode {
    return this.state.viewMode;
  }

  get zoomLevel(): number {
    return this.state.zoomLevel;
  }

  get activeTerminalId(): string {
    return this.state.activeTerminalId || this.workspace.focusedTerminalId || this.workspace.focusedPaneId;
  }

  get announcementText(): string {
    return this.announcement;
  }

  isFocusMode(): boolean {
    return this.state.viewMode === 'focus';
  }

  isOverviewMode(): boolean {
    return this.state.viewMode === 'overview';
  }

  bindWorkspace(workspaceId: string, activeTerminalId = ''): void {
    const sameWorkspace = this.state.workspaceId === workspaceId;
    this.state = {
      workspaceId,
      activeTerminalId: activeTerminalId || this.workspace.focusedPaneId || '',
      viewMode: sameWorkspace ? this.state.viewMode : 'focus',
      zoomLevel: sameWorkspace ? this.state.zoomLevel : 0,
    };
    if (!sameWorkspace) {
      this.announcement = '';
    }
  }

  setActiveTerminalId(terminalId: string, announce = true): void {
    this.state = { ...this.state, activeTerminalId: terminalId };
    if (announce && terminalId) {
      const terminals = this.workspace.getActiveTabTerminals();
      const index = terminals.findIndex((terminal) => terminal.id === terminalId);
      if (index >= 0) {
        const title = this.workspace.getTerminalDisplayTitle(terminals[index], index);
        this.announcement = `Terminal ${index + 1} of ${terminals.length}: ${title}`;
      }
    }
  }

  setViewMode(viewMode: WorkspaceViewMode): void {
    this.state = {
      ...this.state,
      viewMode,
      zoomLevel: viewMode === 'focus' ? 0 : 1,
    };
  }

  setZoomLevel(zoomLevel: number): void {
    const clamped = Math.min(1, Math.max(0, zoomLevel));
    const viewMode: WorkspaceViewMode = clamped < FOCUS_ZOOM_THRESHOLD ? 'focus' : 'overview';
    this.state = {
      ...this.state,
      zoomLevel: clamped,
      viewMode,
    };
  }

  toggleOverview(): void {
    this.setViewMode(this.state.viewMode === 'overview' ? 'focus' : 'overview');
  }

  enterOverview(): void {
    this.setViewMode('overview');
  }

  enterFocus(): void {
    this.setViewMode('focus');
  }

  /** Snap zoom control to focus or overview for the initial two-state implementation. */
  snapZoomFromControl(value: number): void {
    this.setZoomLevel(value < FOCUS_ZOOM_THRESHOLD ? 0 : 1);
  }

  getActiveTerminalIndex(): number {
    const terminals = this.workspace.getActiveTabTerminals();
    const activeId = this.activeTerminalId;
    return Math.max(
      0,
      terminals.findIndex((terminal) => terminal.id === activeId)
    );
  }

  getTerminalCount(): number {
    return this.workspace.getActiveTabTerminals().length;
  }

  getTerminalIdAtIndex(index: number): string | null {
    const terminals = this.workspace.getActiveTabTerminals();
    if (index < 0 || index >= terminals.length) {
      return null;
    }
    return terminals[index].id;
  }

  /** Jump to 1-based terminal index (1–10). */
  getTerminalIdForShortcut(oneBasedIndex: number): string | null {
    if (oneBasedIndex < 1 || oneBasedIndex > 10) {
      return null;
    }
    return this.getTerminalIdAtIndex(oneBasedIndex - 1);
  }

  getAdjacentTerminalId(offset: -1 | 1): string | null {
    const terminals = this.workspace.getActiveTabTerminals();
    if (terminals.length <= 1) {
      return null;
    }
    const currentIndex = this.getActiveTerminalIndex();
    const nextIndex = (currentIndex + offset + terminals.length) % terminals.length;
    return terminals[nextIndex]?.id ?? null;
  }
}
