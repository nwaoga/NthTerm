import { Injectable } from '@angular/core';

export interface SavedWorkspace {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  templateId: string;
  icon: string;
  accent: string;
  layoutMode: string;
  launchProfile: string;
  sessionSnapshot: {
    layout: {
      mode: string;
      activeTabId: string;
      focusedPaneId: string;
      colSplit?: number;
      rowSplit?: number;
      panes: Array<{
        id: string;
        tabId: string | null;
      }>;
    };
    tabs: Array<{
      id: string;
      title: string;
      cwd: string;
      status: string;
      accent: string;
      shell?: string;
      startupCommand?: string;
    }>;
  };
  updatedAt: string;
}

export interface WorkspaceDraft {
  id?: string;
  name: string;
  cwd: string;
  shell?: string;
  templateId?: string;
  icon?: string;
  accent?: string;
  layoutMode?: string;
  launchProfile?: string;
  sessionSnapshot?: SavedWorkspace['sessionSnapshot'];
}

export interface WorkspaceDeleteResult {
  deletedId: string;
  deletedName: string;
  activeWorkspace: SavedWorkspace | null;
}

export interface WorkspaceRenameResult extends SavedWorkspace {
  error?: string;
}

interface WorkspaceApi {
  listWorkspaces(): Promise<SavedWorkspace[]>;
  getActiveWorkspace(): Promise<SavedWorkspace>;
  getLaunchWorkspace(): Promise<SavedWorkspace>;
  createWorkspace(workspace: WorkspaceDraft): Promise<SavedWorkspace>;
  saveWorkspace(workspace: WorkspaceDraft): Promise<SavedWorkspace>;
  setActiveWorkspace(workspaceId: string): Promise<SavedWorkspace>;
  renameWorkspace(workspaceId: string, name: string): Promise<WorkspaceRenameResult | null>;
  deleteWorkspace(workspaceId: string): Promise<WorkspaceDeleteResult | { error: string } | null>;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceBridgeService {
  listWorkspaces(): Promise<SavedWorkspace[]> {
    return this.getApi().listWorkspaces();
  }

  getActiveWorkspace(): Promise<SavedWorkspace> {
    return this.getApi().getActiveWorkspace();
  }

  getLaunchWorkspace(): Promise<SavedWorkspace> {
    return this.getApi().getLaunchWorkspace();
  }

  createWorkspace(workspace: WorkspaceDraft): Promise<SavedWorkspace> {
    return this.getApi().createWorkspace(workspace);
  }

  saveWorkspace(workspace: WorkspaceDraft): Promise<SavedWorkspace> {
    return this.getApi().saveWorkspace(workspace);
  }

  setActiveWorkspace(workspaceId: string): Promise<SavedWorkspace> {
    return this.getApi().setActiveWorkspace(workspaceId);
  }

  renameWorkspace(workspaceId: string, name: string): Promise<WorkspaceRenameResult | null> {
    return this.getApi().renameWorkspace(workspaceId, name);
  }

  deleteWorkspace(workspaceId: string): Promise<WorkspaceDeleteResult | { error: string } | null> {
    return this.getApi().deleteWorkspace(workspaceId);
  }

  private getApi(): WorkspaceApi {
    const api = window.nthTermDesktop?.workspace as WorkspaceApi | undefined;
    if (!api) {
      throw new Error('Electron workspace bridge is not available.');
    }

    return api;
  }
}
