import { Injectable } from '@angular/core';

export interface SavedWorkspace {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  updatedAt: string;
}

interface WorkspaceApi {
  getDefaultWorkspace(): Promise<SavedWorkspace>;
  saveDefaultWorkspace(workspace: {
    name: string;
    cwd: string;
    shell?: string;
  }): Promise<SavedWorkspace>;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceBridgeService {
  getDefaultWorkspace(): Promise<SavedWorkspace> {
    return this.getApi().getDefaultWorkspace();
  }

  saveDefaultWorkspace(workspace: {
    name: string;
    cwd: string;
    shell?: string;
  }): Promise<SavedWorkspace> {
    return this.getApi().saveDefaultWorkspace(workspace);
  }

  private getApi(): WorkspaceApi {
    const api = window.nthTermDesktop?.workspace as WorkspaceApi | undefined;
    if (!api) {
      throw new Error('Electron workspace bridge is not available.');
    }

    return api;
  }
}
