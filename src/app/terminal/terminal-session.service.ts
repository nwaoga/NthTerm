import { Injectable, NgZone, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { RuntimeSessionInfo, RuntimeTerminal } from '../models';
import { TerminalInfo } from '../terminal-bridge.service';
import { TerminalBridgeService } from '../terminal-bridge.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { AppPreferencesService } from '../preferences/app-preferences.service';
import { resolveTerminalTheme, toXtermTheme } from './terminal-theme.util';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

interface TerminalState {
  terminalId: string;
  attachedHostId?: string;
  terminal?: Terminal;
  fitAddon?: FitAddon;
  resizeObserver?: ResizeObserver;
  host?: HTMLElement;
  container?: HTMLDivElement;
  sessionId?: string;
  startPromise?: Promise<void>;
  info: RuntimeSessionInfo | null;
  inputBuffer: string;
  interactive?: boolean;
  lastCols?: number;
  lastRows?: number;
}

export function sanitizeTerminalInput(data: string): string {
  return data
    .replace(/\u0000/g, '')
    .replace(/\u001b\[200~/g, '')
    .replace(/\u001b\[201~/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001bO./g, '');
}

@Injectable({ providedIn: 'root' })
export class TerminalSessionService {
  private terminalHosts = new Map<string, HTMLElement>();
  private terminalSessions = new Map<string, TerminalState>();
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;
  private removeInfoListener?: () => void;
  private resizeDebounceId?: ReturnType<typeof setTimeout>;
  private previewSessionInfo: RuntimeSessionInfo | null = null;
  private interactiveTerminalId = '';
  private previewVersion = 0;

  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef, { optional: true });
  private readonly terminalBridge = inject(TerminalBridgeService);
  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly preferences = inject(AppPreferencesService);
  private readonly utility = inject(UtilityPanelService);
  private readonly systemMonitor = inject(SystemMonitorService);

  get sessionInfo(): RuntimeSessionInfo | null {
    if (this.workspace.previewMode) {
      return this.previewSessionInfo;
    }

    return this.getFocusedTerminalState()?.info || null;
  }

  get sessionActive(): boolean {
    if (this.workspace.previewMode) {
      return Boolean(this.previewSessionInfo);
    }

    return Boolean(this.getFocusedTerminalState()?.sessionId);
  }

  setPreviewSessionInfo(info: RuntimeSessionInfo | null): void {
    this.previewSessionInfo = info;
  }

  setTerminalHosts(hosts: Map<string, HTMLElement>): void {
    this.terminalHosts = hosts;
  }

  setInteractiveTerminalId(terminalId: string): void {
    this.interactiveTerminalId = terminalId || '';
  }

  getInteractiveTerminalId(): string {
    return this.interactiveTerminalId;
  }

  /** Bumps when terminal output changes so overview cards can refresh. */
  getPreviewVersion(): number {
    return this.previewVersion;
  }

  getBufferPreview(terminalId: string, maxLines = 8): string {
    const state = this.terminalSessions.get(terminalId);
    const terminal = state?.terminal;
    if (!terminal) {
      return '';
    }

    const buffer = terminal.buffer.active;
    const lines: string[] = [];
    const end = buffer.baseY + buffer.cursorY;
    const start = Math.max(0, end - maxLines + 1);
    for (let y = start; y <= end; y += 1) {
      const line = buffer.getLine(y)?.translateToString(true)?.trimEnd() ?? '';
      if (line.trim()) {
        lines.push(line);
      }
    }

    return lines.slice(-maxLines).join('\n');
  }

  reattachPaneSession(terminalId: string): void {
    this.reattachTerminalSession(terminalId);
  }

  reattachTerminalSession(terminalId: string): void {
    const runtimeTerminal = this.workspace.getTerminalById(terminalId);
    const host = this.terminalHosts.get(terminalId);
    const state = this.terminalSessions.get(terminalId);

    if (!runtimeTerminal || !host || !state?.container) {
      return;
    }

    this.attachStateToHost(state, terminalId, host);
    this.applyTerminalTheme(terminalId, runtimeTerminal);
  }

  applyTerminalTheme(terminalId: string, runtimeTerminal: RuntimeTerminal): void {
    const state = this.terminalSessions.get(terminalId);
    if (!state?.terminal) {
      return;
    }

    const theme = resolveTerminalTheme(
      runtimeTerminal.theme,
      this.preferences.readDefaultTerminalTheme()
    );
    state.terminal.options.theme = toXtermTheme(theme, this.preferences.readTerminalAnsiPalette());
    this.styleTerminalHost(terminalId, theme);
  }

  refreshAllTerminalThemes(): void {
    for (const terminalId of this.terminalSessions.keys()) {
      const runtimeTerminal = this.workspace.getTerminalById(terminalId);
      if (runtimeTerminal) {
        this.applyTerminalTheme(terminalId, runtimeTerminal);
      }
    }
  }

  focusPaneTerminal(terminalId = this.workspace.focusedPaneId): void {
    this.focusTerminal(terminalId);
  }

  focusTerminal(terminalId = this.workspace.focusedPaneId): void {
    this.reattachTerminalSession(terminalId);
    const state = this.getTerminalState(terminalId);
    if (!state?.terminal) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        state.fitAddon?.fit();
        state.terminal?.focus();
      });
    });
  }

  async restorePaneSessions(): Promise<void> {
    await this.restoreTerminalSessions();
  }

  async restoreTerminalSessions(): Promise<void> {
    if (this.workspace.previewMode) {
      return;
    }

    this.registerTerminalListeners();
    const workspaceTerminalIds = new Set(this.workspace.terminals.map((terminal) => terminal.id));

    for (const terminal of this.workspace.terminals) {
      const host = this.terminalHosts.get(terminal.id);
      if (!host) {
        continue;
      }

      await this.ensureTerminalSession(terminal.id, terminal);
    }

    for (const terminalId of Array.from(this.terminalSessions.keys())) {
      if (!workspaceTerminalIds.has(terminalId)) {
        await this.disposeTerminalSession(terminalId);
      }
    }

    this.reattachVisibleTerminalSessions();
    await this.refreshFocusedTerminalContext();
  }

  async relaunchTerminal(): Promise<void> {
    const terminalId = this.workspace.focusedPaneId;
    const runtimeTerminal = this.workspace.getFocusedTerminal();
    if (!runtimeTerminal) {
      return;
    }

    this.workspace.updateTerminalStatus(terminalId, 'restarting');
    await this.disposeTerminalSession(terminalId);
    await this.ensureTerminalSession(terminalId, runtimeTerminal);
    await this.refreshFocusedTerminalContext();
  }

  async interruptTerminal(): Promise<void> {
    const state = this.getFocusedTerminalState();
    if (!state?.sessionId) {
      return;
    }

    await this.terminalBridge.interruptSession(state.sessionId);
    this.workspace.status = 'Sent interrupt signal to terminal.';
    this.utility.appendOutput(this.workspace.status, 'warn');
  }

  async killTerminal(): Promise<void> {
    const terminalId = this.workspace.focusedPaneId;
    const state = this.getFocusedTerminalState();
    if (!state?.sessionId) {
      return;
    }

    const sessionInfo = state.info;
    await this.disposeTerminalSession(terminalId);
    void this.systemMonitor.refreshSessionEnvironment(undefined);
    this.workspace.status = 'Terminal session killed.';
    this.utility.appendOutput(this.workspace.status, 'warn');

    this.workspace.updateTerminalStatus(terminalId, 'stopped');
    this.workspace.recordSessionEvent(terminalId, {
      status: 'killed',
      reason: 'Killed from inspector',
      startedAt: sessionInfo?.startedAt || null,
      lastActiveAt: sessionInfo?.lastActiveAt || null,
      endedAt: new Date().toISOString(),
      exitCode: sessionInfo?.exitCode ?? null,
      detectedPort: sessionInfo?.detectedPort ?? null,
    });
    this.workspace.updateTerminalSessionSnapshot(terminalId, null);
    await this.workspace.persistWorkspaceState();
  }

  async rerunCommand(command: string): Promise<void> {
    const state = this.getFocusedTerminalState();
    if (!state?.sessionId || !command.trim()) {
      return;
    }

    await this.terminalBridge.sendInput(state.sessionId, `${command}\r`);
    this.utility.appendOutput(`Re-ran command: ${command}`, 'info');
  }

  syncTerminalSize(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        for (const state of this.terminalSessions.values()) {
          if (!state.host || !state.attachedHostId || !this.isInteractiveHost(state)) {
            continue;
          }

          state.fitAddon?.fit();
          if (state.terminal && state.sessionId) {
            const cols = state.terminal.cols;
            const rows = state.terminal.rows;
            if (cols === state.lastCols && rows === state.lastRows) {
              continue;
            }
            state.lastCols = cols;
            state.lastRows = rows;
            void this.terminalBridge.resizeSession(state.sessionId, cols, rows);
          }
        }
      });
    });
  }

  dispose(): void {
    for (const terminalId of Array.from(this.terminalSessions.keys())) {
      void this.disposeTerminalSession(terminalId);
    }
    this.removeInfoListener?.();
    this.removeDataListener?.();
    this.removeExitListener?.();
    this.removeInfoListener = undefined;
    this.removeDataListener = undefined;
    this.removeExitListener = undefined;
    clearTimeout(this.resizeDebounceId);
  }

  private async ensureTerminalSession(
    terminalId: string,
    runtimeTerminal: RuntimeTerminal
  ): Promise<void> {
    const host = this.terminalHosts.get(terminalId);
    if (!host) {
      return;
    }

    const state = this.terminalSessions.get(terminalId) || this.createTerminalState(terminalId);
    await this.ensureTerminalSurface(state, runtimeTerminal);
    this.attachStateToHost(state, terminalId, host);
    this.applyTerminalTheme(terminalId, runtimeTerminal);

    if (state.sessionId) {
      this.workspace.updateTerminalStatus(terminalId, state.info?.status || 'running');
      this.workspace.updateTerminalSessionSnapshot(
        terminalId,
        this.toTerminalSnapshot(state, runtimeTerminal.cwd)
      );
      return;
    }

    if (!state.startPromise) {
      state.startPromise = this.startTerminalSession(state, runtimeTerminal);
    }

    const startPromise = state.startPromise;
    try {
      await startPromise;
    } finally {
      if (state.startPromise === startPromise) {
        state.startPromise = undefined;
      }
    }
  }

  private async ensureTerminalSurface(
    state: TerminalState,
    runtimeTerminal: RuntimeTerminal
  ): Promise<void> {
    if (state.terminal && state.fitAddon && state.container) {
      return;
    }

    state.resizeObserver?.disconnect();
    state.terminal?.dispose();

    const theme = resolveTerminalTheme(
      runtimeTerminal.theme,
      this.preferences.readDefaultTerminalTheme()
    );
    const fitAddon = new FitAddon();
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    const terminal = new Terminal({
      cursorBlink: true,
      drawBoldTextInBrightColors: true,
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 14,
      theme: toXtermTheme(theme, this.preferences.readTerminalAnsiPalette()),
    });

    terminal.loadAddon(fitAddon);
    terminal.open(container);
    terminal.onData((data) => {
      const sanitizedData = sanitizeTerminalInput(data);
      this.trackTerminalInput(state, sanitizedData);
      if (state.sessionId && sanitizedData) {
        void this.terminalBridge.sendInput(state.sessionId, sanitizedData);
      }
    });

    const observer = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounceId);
      this.resizeDebounceId = setTimeout(() => this.syncTerminalSize(), 60);
    });
    observer.observe(container);

    state.fitAddon = fitAddon;
    state.terminal = terminal;
    state.resizeObserver = observer;
    state.container = container;
  }

  private async startTerminalSession(
    state: TerminalState,
    runtimeTerminal: RuntimeTerminal
  ): Promise<void> {
    const targetDirectory =
      runtimeTerminal.cwd?.trim() || this.workspace.workingDirectory.trim();
    if (!targetDirectory || !state.terminal || !state.fitAddon) {
      this.workspace.status = 'Working directory is required.';
      this.utility.appendOutput(this.workspace.status, 'warn');
      return;
    }

    this.workspace.status = `Launching terminal in ${targetDirectory}...`;
    if (this.workspace.focusedPaneId === state.attachedHostId) {
      this.utility.appendOutput(this.workspace.status, 'info');
    }
    state.terminal.clear();
    state.terminal.reset();

    state.sessionId = await this.terminalBridge.createSession({
      terminalId: state.terminalId,
      cwd: targetDirectory,
      workspaceName: this.workspace.workspaceName,
      shell: runtimeTerminal.shell || '',
    });
    state.info = await this.terminalBridge.getSessionInfo(state.sessionId);
    this.workspace.updateTerminalStatus(state.terminalId, 'running');
    if (state.attachedHostId) {
      this.workspace.updateTerminalSessionSnapshot(
        state.attachedHostId,
        this.toTerminalSnapshot(state, targetDirectory)
      );
    }
    this.workspace.recordSessionLaunch(state.attachedHostId || this.workspace.focusedPaneId, {
      shell: state.info?.shell || runtimeTerminal.shell || '',
      startedAt: state.info?.startedAt || null,
    });
    await this.workspace.persistWorkspaceState();
    this.syncTerminalSize();
    if (this.workspace.focusedPaneId === state.attachedHostId) {
      await this.systemMonitor.refreshSessionEnvironment(state.sessionId);
      if (state.attachedHostId) {
        this.focusTerminal(state.attachedHostId);
      }
      this.workspace.status = `Connected to ${targetDirectory}`;
      this.utility.appendOutput(`Terminal session attached to ${targetDirectory}`, 'info');
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.runStartupCommands(state.sessionId, runtimeTerminal.startupCommand);
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
      const state = this.findTerminalStateBySessionId(event.id);
      if (!state) {
        return;
      }

      state.info = event;
      const runtimeTerminal = this.workspace.getTerminalById(state.terminalId);
      if (state.attachedHostId) {
        this.workspace.updateTerminalSessionSnapshot(
          state.attachedHostId,
          this.toTerminalSnapshot(state, runtimeTerminal?.cwd || event.cwd)
        );
      }
    });

    this.removeDataListener = this.terminalBridge.onData((event) => {
      const state = this.findTerminalStateBySessionId(event.id);
      if (!state) {
        return;
      }

      this.ngZone.runOutsideAngular(() => state.terminal?.write(event.data));
      this.previewVersion += 1;
      this.ngZone.run(() => {
        const source = this.workspace.workspaceName || 'Terminal';
        this.utility.scanOutputForProblems(event.data, source);
        this.changeDetectorRef?.markForCheck();
      });
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      const state = this.findTerminalStateBySessionId(event.id);
      if (!state) {
        return;
      }

      const runtimeTerminal = this.workspace.getTerminalById(state.terminalId);
      const endedAt = new Date().toISOString();
      state.info = {
        ...(state.info || this.buildEmptyInfo(event.id)),
        status: 'stopped',
        exitCode: event.exitCode ?? null,
        endedAt,
      };
      state.sessionId = undefined;

      this.workspace.updateTerminalStatus(state.terminalId, 'stopped');
      this.workspace.recordSessionEvent(state.attachedHostId || this.workspace.focusedPaneId, {
        status: event.exitCode && event.exitCode !== 0 ? 'failed' : 'stopped',
        reason: event.exitCode && event.exitCode !== 0 ? 'Process exited with error' : 'Process exited',
        startedAt: state.info?.startedAt || null,
        lastActiveAt: state.info?.lastActiveAt || null,
        endedAt,
        exitCode: event.exitCode ?? null,
        detectedPort: state.info?.detectedPort ?? null,
      });

      if (state.attachedHostId) {
        this.workspace.updateTerminalSessionSnapshot(
          state.attachedHostId,
          this.toTerminalSnapshot(state, runtimeTerminal?.cwd || state.info?.cwd || '')
        );
      }
      if (this.workspace.focusedPaneId === state.attachedHostId) {
        void this.systemMonitor.refreshSessionEnvironment(undefined);
        this.workspace.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
        this.utility.appendOutput(this.workspace.status, event.exitCode ? 'error' : 'info');
      }
      void this.workspace.persistWorkspaceState();
    });
  }

  private async disposeTerminalSession(terminalId: string): Promise<void> {
    const state = this.terminalSessions.get(terminalId);
    if (!state) {
      return;
    }

    try {
      await state.startPromise;
    } catch {
      // A failed start has no PTY to dispose; surface cleanup still needs to run.
    }

    state.resizeObserver?.disconnect();
    state.terminal?.dispose();
    state.container?.remove();
    if (state.sessionId) {
      await this.terminalBridge.disposeSession(state.sessionId);
    }

    this.terminalSessions.delete(terminalId);
    if (state.attachedHostId) {
      this.workspace.updateTerminalSessionSnapshot(state.attachedHostId, null);
    }
  }

  private trackTerminalInput(state: TerminalState, data: string): void {
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

  private commitTerminalInput(state: TerminalState): void {
    const command = state.inputBuffer.trim();
    state.inputBuffer = '';

    if (!command) {
      return;
    }

    const terminal = this.workspace.getTerminalById(state.terminalId);
    const terminalIndex = terminal ? this.workspace.terminals.indexOf(terminal) : 0;
    this.ngZone.run(() => {
      this.utility.trackCommand(command, {
        terminalId: state.terminalId,
        tabTitle: this.workspace.workspaceName || 'Workspace',
        terminalTitle: terminal
          ? this.workspace.getTerminalDisplayTitle(terminal, Math.max(0, terminalIndex))
          : 'Terminal',
      });
      this.changeDetectorRef?.markForCheck();
    });
  }

  private getFocusedTerminalState(): TerminalState | undefined {
    return this.getTerminalState(this.workspace.focusedPaneId);
  }

  private findTerminalStateBySessionId(sessionId: string): TerminalState | undefined {
    for (const state of this.terminalSessions.values()) {
      if (state.sessionId === sessionId) {
        return state;
      }
    }

    return undefined;
  }

  private createTerminalState(terminalId: string): TerminalState {
    const state: TerminalState = {
      terminalId,
      info: null,
      inputBuffer: '',
    };
    this.terminalSessions.set(terminalId, state);
    return state;
  }

  private async refreshFocusedTerminalContext(): Promise<void> {
    const focusedState = this.getFocusedTerminalState();
    const focusedTerminal = this.workspace.getFocusedTerminal();

    if (!focusedState?.sessionId) {
      await this.systemMonitor.refreshSessionEnvironment(undefined);
      return;
    }

    this.workspace.workingDirectory = focusedTerminal?.cwd || this.workspace.workingDirectory;
    await this.systemMonitor.refreshSessionEnvironment(focusedState.sessionId);
    this.syncTerminalSize();
    this.focusTerminal(this.workspace.focusedPaneId);
    this.changeDetectorRef?.markForCheck();
  }

  private toTerminalSnapshot(state: TerminalState, cwd: string) {
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

  private getTerminalState(terminalId: string): TerminalState | undefined {
    if (!terminalId) {
      return undefined;
    }

    return this.terminalSessions.get(terminalId);
  }

  private reattachVisibleTerminalSessions(): void {
    for (const terminal of this.workspace.terminals) {
      this.reattachTerminalSession(terminal.id);
    }

    this.syncTerminalSize();
  }

  private styleTerminalHost(terminalId: string, theme: { foreground: string; background: string }): void {
    const host = this.terminalHosts.get(terminalId);
    if (!host) {
      return;
    }

    host.style.setProperty('--terminal-surface-bg', theme.background);
    host.style.setProperty('--terminal-surface-fg', theme.foreground);
  }

  private attachStateToHost(state: TerminalState, terminalId: string, host: HTMLElement): void {
    if (!state.container) {
      return;
    }

    if (host.firstChild !== state.container || host.childNodes.length !== 1) {
      host.replaceChildren(state.container);
    }

    state.host = host;
    state.attachedHostId = terminalId;
    state.interactive = this.isHostMarkedInteractive(host);

    if (!this.isInteractiveHost(state)) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        state.fitAddon?.fit();
        if (state.terminal && state.sessionId) {
          const cols = state.terminal.cols;
          const rows = state.terminal.rows;
          state.lastCols = cols;
          state.lastRows = rows;
          void this.terminalBridge.resizeSession(state.sessionId, cols, rows);
        }
      });
    });
  }

  private isInteractiveHost(state: TerminalState): boolean {
    if (state.host?.dataset['terminalPark'] === 'true') {
      return false;
    }
    if (this.interactiveTerminalId) {
      return state.attachedHostId === this.interactiveTerminalId;
    }
    return state.interactive !== false;
  }

  private isHostMarkedInteractive(host?: HTMLElement | null): boolean {
    if (!host) {
      return false;
    }
    if (host.dataset['terminalPark'] === 'true') {
      return false;
    }
    if (host.dataset['terminalInteractive'] === 'true') {
      return true;
    }
    // Legacy hosts without park/interactive markers remain resizable.
    return !('terminalPark' in host.dataset) && !('terminalInteractive' in host.dataset);
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
