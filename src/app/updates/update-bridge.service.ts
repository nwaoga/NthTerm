import { Injectable } from '@angular/core';

export type UpdateStatusPhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateStatusPayload {
  phase: UpdateStatusPhase;
  version?: string | null;
  currentVersion?: string;
  percent?: number | null;
  message?: string | null;
}

export interface UpdatesApi {
  getVersion(): Promise<string>;
  getStatus(): Promise<UpdateStatusPayload>;
  check(): Promise<{ ok: boolean; reason?: string; message?: string }>;
  quitAndInstall(): Promise<{ ok: boolean; reason?: string }>;
  onStatus(listener: (payload: UpdateStatusPayload) => void): () => void;
}

@Injectable({ providedIn: 'root' })
export class UpdateBridgeService {
  isAvailable(): boolean {
    return Boolean(window.nthTermDesktop?.updates);
  }

  getVersion(): Promise<string> {
    return this.getApi().getVersion();
  }

  getStatus(): Promise<UpdateStatusPayload> {
    return this.getApi().getStatus();
  }

  check(): Promise<{ ok: boolean; reason?: string; message?: string }> {
    return this.getApi().check();
  }

  quitAndInstall(): Promise<{ ok: boolean; reason?: string }> {
    return this.getApi().quitAndInstall();
  }

  onStatus(listener: (payload: UpdateStatusPayload) => void): () => void {
    return this.getApi().onStatus(listener);
  }

  private getApi(): UpdatesApi {
    const api = window.nthTermDesktop?.updates;
    if (!api) {
      throw new Error('Electron updates bridge is not available.');
    }

    return api;
  }
}

declare global {
  interface DesktopApi {
    updates?: UpdatesApi;
  }
}
