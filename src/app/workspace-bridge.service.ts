import { Injectable } from '@angular/core';
import { PaneSessionSnapshot, RecoverySnapshot, SessionHistoryEntry, TerminalColorTheme } from './models';

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
      /** @deprecated Migrated away; ignored on write. */
      activeTabId?: string;
      focusedPaneId?: string;
      focusedTerminalId?: string;
      colSplit?: number;
      rowSplit?: number;
      /** @deprecated Legacy pane list; migrate-on-read only. */
      panes?: Array<{
        id: string;
        tabId: string | null;
        session?: PaneSessionSnapshot | null;
      }>;
    };
    /** Workspace-owned terminals (canonical post-tabs shape). */
    terminals?: Array<{
      id: string;
      name?: string;
      cwd: string;
      shell?: string;
      startupCommand?: string;
      status: string;
      session?: PaneSessionSnapshot | null;
      theme?: TerminalColorTheme | null;
    }>;
    /** @deprecated Multi-tab snapshots; migrate-on-read keeps active tab only. */
    tabs?: Array<{
      id: string;
      title: string;
      cwd: string;
      accent: string;
      shell?: string;
      startupCommand?: string;
      status?: string;
      layoutMode?: string;
      colSplit?: number;
      rowSplit?: number;
      focusedTerminalId?: string;
      terminals?: Array<{
        id: string;
        name?: string;
        cwd: string;
        shell?: string;
        startupCommand?: string;
        status: string;
        session?: PaneSessionSnapshot | null;
        theme?: TerminalColorTheme | null;
      }>;
    }>;
    history?: SessionHistoryEntry[];
    recovery?: RecoverySnapshot;
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

export interface WorkspaceDirectoryDefaults {
  homeDirectory: string;
}

interface WorkspaceApi {
  listWorkspaces(): Promise<SavedWorkspace[]>;
  getActiveWorkspace(): Promise<SavedWorkspace>;
  getLaunchWorkspace(): Promise<SavedWorkspace>;
  getDirectoryDefaults(): Promise<WorkspaceDirectoryDefaults>;
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

  getDirectoryDefaults(): Promise<WorkspaceDirectoryDefaults> {
    return this.getApi().getDirectoryDefaults();
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
