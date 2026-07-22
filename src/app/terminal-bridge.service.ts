import { Injectable } from '@angular/core';

import type { AppApi } from './app-bridge.service';
import type { SystemApi } from './system-bridge.service';

export interface TerminalDataEvent {
  id: string;
  data: string;
}

export interface TerminalExitEvent {
  id: string;
  exitCode?: number;
}

export interface TerminalInfo {
  id: string;
  pid: number | null;
  cwd: string;
  shell: string;
  status: string;
  startedAt: string | null;
  lastActiveAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  detectedPort: number | null;
}

interface TerminalApi {
  createTerminal(options?: {
    terminalId?: string;
    cwd?: string;
    workspaceName?: string;
    shell?: string;
  }): Promise<{ id: string }>;
  listWslDistros(): Promise<string[]>;
  writeTerminal(id: string, data: string): Promise<void>;
  resizeTerminal(id: string, cols: number, rows: number): Promise<void>;
  getTerminalInfo(id: string): Promise<TerminalInfo | null>;
  interruptTerminal(id: string): Promise<void>;
  disposeTerminal(id: string): Promise<void>;
  onTerminalData(listener: (event: TerminalDataEvent) => void): () => void;
  onTerminalExit(listener: (event: TerminalExitEvent) => void): () => void;
  onTerminalInfo(listener: (event: TerminalInfo) => void): () => void;
}

@Injectable({ providedIn: 'root' })
export class TerminalBridgeService {
  async createSession(options?: {
    terminalId?: string;
    cwd?: string;
    workspaceName?: string;
    shell?: string;
  }): Promise<string> {
    const session = await this.getApi().createTerminal(options);
    return session.id;
  }

  listWslDistros(): Promise<string[]> {
    return this.getApi().listWslDistros();
  }

  sendInput(id: string, data: string): Promise<void> {
    return this.getApi().writeTerminal(id, data);
  }

  resizeSession(id: string, cols: number, rows: number): Promise<void> {
    return this.getApi().resizeTerminal(id, cols, rows);
  }

  getSessionInfo(id: string): Promise<TerminalInfo | null> {
    return this.getApi().getTerminalInfo(id);
  }

  interruptSession(id: string): Promise<void> {
    return this.getApi().interruptTerminal(id);
  }

  disposeSession(id: string): Promise<void> {
    return this.getApi().disposeTerminal(id);
  }

  onData(listener: (event: TerminalDataEvent) => void): () => void {
    return this.getApi().onTerminalData(listener);
  }

  onExit(listener: (event: TerminalExitEvent) => void): () => void {
    return this.getApi().onTerminalExit(listener);
  }

  onInfo(listener: (event: TerminalInfo) => void): () => void {
    return this.getApi().onTerminalInfo(listener);
  }

  private getApi(): TerminalApi {
    const api = window.nthTermDesktop?.terminal;
    if (!api) {
      throw new Error('Electron terminal bridge is not available.');
    }

    return api;
  }
}

declare global {
  interface DesktopApi {
    platform?: string;
    terminal?: TerminalApi;
    workspace?: any;
    system?: SystemApi;
    app?: AppApi;
  }

  interface Window {
    nthTermDesktop?: DesktopApi;
  }
}
