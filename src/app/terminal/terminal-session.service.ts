import { Injectable, NgZone, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { RuntimeSessionInfo } from '../models';
import { RuntimeTab } from '../models';
import { TerminalInfo } from '../terminal-bridge.service';
import { TerminalBridgeService } from '../terminal-bridge.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

interface PaneTerminalState {
  paneId: string;
  tabId: string;
  terminal?: Terminal;
  fitAddon?: FitAddon;
  resizeObserver?: ResizeObserver;
  host?: HTMLElement;
  sessionId?: string;
  info: RuntimeSessionInfo | null;
  inputBuffer: string;
}

@Injectable({ providedIn: 'root' })
export class TerminalSessionService {
  private paneHosts = new Map<string, HTMLElement>();
  private paneSessions = new Map<string, PaneTerminalState>();
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;
  private removeInfoListener?: () => void;
  private resizeDebounceId?: ReturnType<typeof setTimeout>;
  private previewSessionInfo: RuntimeSessionInfo | null = null;

  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef, { optional: true });
  private readonly terminalBridge = inject(TerminalBridgeService);
  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly utility = inject(UtilityPanelService);
  private readonly systemMonitor = inject(SystemMonitorService);

  get sessionInfo(): RuntimeSessionInfo | null {
    if (this.workspace.previewMode) {
      return this.previewSessionInfo;
    }

    return this.getFocusedPaneState()?.info || null;
  }

  get sessionActive(): boolean {
    return Boolean(this.getFocusedPaneState()?.sessionId);
  }

  setPreviewSessionInfo(info: RuntimeSessionInfo | null): void {
    this.previewSessionInfo = info;
  }

  setTerminalHosts(hosts: Map<string, HTMLElement>): void {
    this.paneHosts = hosts;
  }

  async restorePaneSessions(): Promise<void> {
    if (this.workspace.previewMode) {
      return;
    }

    this.registerTerminalListeners();
    const activePaneIds = new Set(this.workspace.runtimePanes.map((pane) => pane.id));

    for (const pane of this.workspace.runtimePanes) {
      const tab = this.workspace.getPaneTab(pane);
      if (!tab) {
        await this.disposePaneSession(pane.id);
        continue;
      }

      await this.ensurePaneSession(pane.id, tab);
    }

    for (const paneId of Array.from(this.paneSessions.keys())) {
      if (!activePaneIds.has(paneId)) {
        await this.disposePaneSession(paneId);
      }
    }

    await this.refreshFocusedPaneContext();
  }

  async relaunchTerminal(): Promise<void> {
    const paneId = this.workspace.focusedPaneId;
    const focusedTab = this.workspace.getFocusedPaneTab();
    if (!focusedTab) {
      return;
    }

    this.workspace.updateTabStatus(focusedTab.id, 'restarting');
    await this.disposePaneSession(paneId);
    await this.ensurePaneSession(paneId, focusedTab);
    await this.refreshFocusedPaneContext();
  }

  async interruptTerminal(): Promise<void> {
    const state = this.getFocusedPaneState();
    if (!state?.sessionId) {
      return;
    }

    await this.terminalBridge.interruptSession(state.sessionId);
    this.workspace.status = 'Sent interrupt signal to terminal.';
    this.utility.appendOutput(this.workspace.status, 'warn');
  }

  async killTerminal(): Promise<void> {
    const paneId = this.workspace.focusedPaneId;
    const state = this.getFocusedPaneState();
    if (!state?.sessionId) {
      return;
    }

    const focusedTab = this.workspace.getFocusedPaneTab();
    const sessionInfo = state.info;
    await this.disposePaneSession(paneId);
    void this.systemMonitor.refreshSessionEnvironment(undefined);
    this.workspace.status = 'Terminal session killed.';
    this.utility.appendOutput(this.workspace.status, 'warn');

    if (focusedTab) {
      this.workspace.updateTabStatus(focusedTab.id, 'stopped');
      this.workspace.recordSessionEvent(focusedTab, this.workspace.focusedPaneId, {
        status: 'killed',
        reason: 'Killed from inspector',
        startedAt: sessionInfo?.startedAt || null,
        lastActiveAt: sessionInfo?.lastActiveAt || null,
        endedAt: new Date().toISOString(),
        exitCode: sessionInfo?.exitCode ?? null,
        detectedPort: sessionInfo?.detectedPort ?? null,
      });
      this.workspace.updatePaneSessionSnapshot(paneId, null);
      await this.workspace.persistWorkspaceState();
    }
  }

  async rerunCommand(command: string): Promise<void> {
    const state = this.getFocusedPaneState();
    if (!state?.sessionId || !command.trim()) {
      return;
    }

    await this.terminalBridge.sendInput(state.sessionId, `${command}\r`);
    this.utility.appendOutput(`Re-ran command: ${command}`, 'info');
  }

  syncTerminalSize(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        for (const state of this.paneSessions.values()) {
          state.fitAddon?.fit();
          if (state.terminal && state.sessionId) {
            void this.terminalBridge.resizeSession(
              state.sessionId,
              state.terminal.cols,
              state.terminal.rows
            );
          }
        }
      });
    });
  }

  dispose(): void {
    for (const paneId of Array.from(this.paneSessions.keys())) {
      void this.disposePaneSession(paneId);
    }
    this.removeInfoListener?.();
    this.removeDataListener?.();
    this.removeExitListener?.();
    this.removeInfoListener = undefined;
    this.removeDataListener = undefined;
    this.removeExitListener = undefined;
    clearTimeout(this.resizeDebounceId);
  }

  private async ensurePaneSession(paneId: string, tab: RuntimeTab): Promise<void> {
    const host = this.paneHosts.get(paneId);
    if (!host) {
      return;
    }

    const existing = this.paneSessions.get(paneId);
    if (existing && existing.tabId !== tab.id) {
      await this.disposePaneSession(paneId);
    }

    const state = this.paneSessions.get(paneId) || this.createPaneState(paneId, tab.id);
    state.tabId = tab.id;
    await this.ensureTerminalSurface(state, host);

    if (state.sessionId) {
      this.workspace.updateTabStatus(tab.id, state.info?.status || 'running');
      this.workspace.updatePaneSessionSnapshot(paneId, this.toPaneSnapshot(state, tab.cwd));
      return;
    }

    await this.startPaneSession(state, tab);
  }

  private async ensureTerminalSurface(state: PaneTerminalState, host: HTMLElement): Promise<void> {
    if (state.host === host && state.terminal && state.fitAddon) {
      return;
    }

    state.resizeObserver?.disconnect();
    state.terminal?.dispose();
    state.host = host;

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#0d1320',
        foreground: '#d8e1e8',
        cursor: '#7dd3fc',
        selectionBackground: '#1f3b53',
      },
    });

    terminal.loadAddon(fitAddon);
    terminal.open(host);
    terminal.onData((data) => {
      this.trackTerminalInput(state, data);
      if (state.sessionId) {
        void this.terminalBridge.sendInput(state.sessionId, data);
      }
    });

    const observer = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounceId);
      this.resizeDebounceId = setTimeout(() => this.syncTerminalSize(), 60);
    });
    observer.observe(host);

    state.fitAddon = fitAddon;
    state.terminal = terminal;
    state.resizeObserver = observer;
  }

  private async startPaneSession(state: PaneTerminalState, tab: RuntimeTab): Promise<void> {
    const targetDirectory = tab.cwd?.trim() || this.workspace.workingDirectory.trim();
    if (!targetDirectory || !state.terminal || !state.fitAddon) {
      this.workspace.status = 'Working directory is required.';
      this.utility.appendOutput(this.workspace.status, 'warn');
      return;
    }

    this.workspace.status = `Launching terminal in ${targetDirectory}...`;
    if (this.workspace.focusedPaneId === state.paneId) {
      this.utility.appendOutput(this.workspace.status, 'info');
    }
    state.terminal.clear();
    state.terminal.reset();

    state.sessionId = await this.terminalBridge.createSession({
      cwd: targetDirectory,
      workspaceName: this.workspace.workspaceName,
      shell: tab.shell || '',
    });
    state.info = await this.terminalBridge.getSessionInfo(state.sessionId);
    this.workspace.updateTabStatus(tab.id, 'running');
    this.workspace.updatePaneSessionSnapshot(state.paneId, this.toPaneSnapshot(state, targetDirectory));
    this.workspace.recordSessionLaunch(tab, state.paneId, {
      shell: state.info?.shell || tab.shell || '',
      startedAt: state.info?.startedAt || null,
    });
    await this.workspace.persistWorkspaceState();
    this.syncTerminalSize();
    if (this.workspace.focusedPaneId === state.paneId) {
      await this.systemMonitor.refreshSessionEnvironment(state.sessionId);
      this.workspace.status = `Connected to ${targetDirectory}`;
      this.utility.appendOutput(`Terminal session attached to ${targetDirectory}`, 'info');
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.runStartupCommands(state.sessionId, tab.startupCommand);
  }

  private async runStartupCommands(sessionId: string | undefined, commands?: string): Promise<void> {
    if (!commands?.trim() || !sessionId) {
      return;
    }

    const lines = commands
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      await this.terminalBridge.sendInput(sessionId, `${line}\r`);
      this.utility.appendOutput(`Ran startup command: ${line}`, 'info');
    }
  }

  private registerTerminalListeners(): void {
    if (this.removeInfoListener || this.removeDataListener || this.removeExitListener) {
      return;
    }

    this.removeInfoListener = this.terminalBridge.onInfo((event) => {
      const state = this.findPaneStateBySessionId(event.id);
      if (!state) {
        return;
      }

      state.info = event;
      const tab = this.workspace.getPaneTab(this.workspace.getPaneById(state.paneId)!);
      this.workspace.updatePaneSessionSnapshot(state.paneId, this.toPaneSnapshot(state, tab?.cwd || event.cwd));
    });

    this.removeDataListener = this.terminalBridge.onData((event) => {
      const state = this.findPaneStateBySessionId(event.id);
      if (!state) {
        return;
      }

      this.ngZone.runOutsideAngular(() => state.terminal?.write(event.data));
      this.ngZone.run(() => {
        const pane = this.workspace.getPaneById(state.paneId);
        const tab = pane ? this.workspace.getPaneTab(pane) : undefined;
        const source = tab?.title || this.workspace.workspaceName || 'Terminal';
        this.utility.scanOutputForProblems(event.data, source);
      });
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      const state = this.findPaneStateBySessionId(event.id);
      if (!state) {
        return;
      }

      const pane = this.workspace.getPaneById(state.paneId);
      const tab = pane ? this.workspace.getPaneTab(pane) : undefined;
      const endedAt = new Date().toISOString();
      state.info = {
        ...(state.info || this.buildEmptyInfo(event.id)),
        status: 'stopped',
        exitCode: event.exitCode ?? null,
        endedAt,
      };
      state.sessionId = undefined;

      if (tab) {
        this.workspace.updateTabStatus(tab.id, 'stopped');
        this.workspace.recordSessionEvent(tab, state.paneId, {
          status: event.exitCode && event.exitCode !== 0 ? 'failed' : 'stopped',
          reason: event.exitCode && event.exitCode !== 0 ? 'Process exited with error' : 'Process exited',
          startedAt: state.info?.startedAt || null,
          lastActiveAt: state.info?.lastActiveAt || null,
          endedAt,
          exitCode: event.exitCode ?? null,
          detectedPort: state.info?.detectedPort ?? null,
        });
      }

      this.workspace.updatePaneSessionSnapshot(state.paneId, this.toPaneSnapshot(state, tab?.cwd || state.info?.cwd || ''));
      if (this.workspace.focusedPaneId === state.paneId) {
        void this.systemMonitor.refreshSessionEnvironment(undefined);
        this.workspace.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
        this.utility.appendOutput(this.workspace.status, event.exitCode ? 'error' : 'info');
      }
      void this.workspace.persistWorkspaceState();
    });
  }

  private async disposePaneSession(paneId: string): Promise<void> {
    const state = this.paneSessions.get(paneId);
    if (!state) {
      return;
    }

    state.resizeObserver?.disconnect();
    state.terminal?.dispose();
    if (state.sessionId) {
      await this.terminalBridge.disposeSession(state.sessionId);
    }

    this.paneSessions.delete(paneId);
    this.workspace.updatePaneSessionSnapshot(paneId, null);
  }

  private trackTerminalInput(state: PaneTerminalState, data: string): void {
    for (const char of data) {
      if (char === '\r' || char === '\n') {
        this.commitTerminalInput(state);
        continue;
      }

      if (char === '\u007f') {
        state.inputBuffer = state.inputBuffer.slice(0, -1);
        continue;
      }

      if (char >= ' ' && char !== '\u007f') {
        state.inputBuffer += char;
      }
    }
  }

  private commitTerminalInput(state: PaneTerminalState): void {
    const command = state.inputBuffer.trim();
    state.inputBuffer = '';

    if (!command) {
      return;
    }

    const pane = this.workspace.getPaneById(state.paneId);
    const focusedTab = pane ? this.workspace.getPaneTab(pane) : undefined;
    this.utility.trackCommand(
      command,
      focusedTab?.title || this.workspace.workspaceName || 'Terminal'
    );
  }

  private getFocusedPaneState(): PaneTerminalState | undefined {
    return this.paneSessions.get(this.workspace.focusedPaneId);
  }

  private findPaneStateBySessionId(sessionId: string): PaneTerminalState | undefined {
    for (const state of this.paneSessions.values()) {
      if (state.sessionId === sessionId) {
        return state;
      }
    }

    return undefined;
  }

  private createPaneState(paneId: string, tabId: string): PaneTerminalState {
    const state: PaneTerminalState = {
      paneId,
      tabId,
      info: null,
      inputBuffer: '',
    };
    this.paneSessions.set(paneId, state);
    return state;
  }

  private async refreshFocusedPaneContext(): Promise<void> {
    const focusedTab = this.workspace.getFocusedPaneTab();
    const focusedState = this.getFocusedPaneState();

    if (!focusedTab || !focusedState?.sessionId) {
      await this.systemMonitor.refreshSessionEnvironment(undefined);
      return;
    }

    this.workspace.activeTabId = focusedTab.id;
    this.workspace.workingDirectory = focusedTab.cwd;
    await this.systemMonitor.refreshSessionEnvironment(focusedState.sessionId);
    this.syncTerminalSize();
    this.changeDetectorRef?.markForCheck();
  }

  private toPaneSnapshot(state: PaneTerminalState, cwd: string) {
    const info = state.info;
    return {
      sessionId: state.sessionId || info?.id || null,
      shell: info?.shell || '',
      cwd: info?.cwd || cwd,
      status: info?.status || 'idle',
      pid: info?.pid ?? null,
      startedAt: info?.startedAt || null,
      lastActiveAt: info?.lastActiveAt || null,
      endedAt: info?.endedAt || null,
      exitCode: info?.exitCode ?? null,
      detectedPort: info?.detectedPort ?? null,
    };
  }

  private buildEmptyInfo(id: string): TerminalInfo {
    return {
      id,
      pid: null,
      cwd: '',
      shell: '',
      status: 'stopped',
      startedAt: null,
      lastActiveAt: null,
      endedAt: null,
      exitCode: null,
      detectedPort: null,
    };
  }
}
