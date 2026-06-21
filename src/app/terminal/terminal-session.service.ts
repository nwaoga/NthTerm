import { Injectable, NgZone, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { RuntimeSessionInfo } from '../models';
import { RuntimeTab } from '../models';
import { TerminalBridgeService } from '../terminal-bridge.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Injectable({ providedIn: 'root' })
export class TerminalSessionService {
  sessionInfo: RuntimeSessionInfo | null = null;

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private sessionId?: string;
  private resizeObserver?: ResizeObserver;
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;
  private removeInfoListener?: () => void;
  private terminalInputBuffer = '';
  private resizeDebounceId?: ReturnType<typeof setTimeout>;
  private terminalHost?: HTMLElement;

  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef, { optional: true });
  private readonly terminalBridge = inject(TerminalBridgeService);
  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly utility = inject(UtilityPanelService);
  private readonly systemMonitor = inject(SystemMonitorService);

  get sessionActive(): boolean {
    return Boolean(this.sessionId);
  }

  setTerminalHost(element: HTMLElement | undefined): void {
    this.terminalHost = element;
  }

  async recreateTerminalSurface(): Promise<void> {
    if (this.workspace.previewMode) {
      return;
    }

    this.terminal?.dispose();
    this.terminal = undefined;
    this.fitAddon = undefined;

    this.changeDetectorRef?.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (!this.terminalHost) {
      return;
    }

    this.fitAddon = new FitAddon();
    this.terminal = new Terminal({
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

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalHost);
    this.terminal.onData((data) => {
      this.trackTerminalInput(data);
      if (this.sessionId) {
        void this.terminalBridge.sendInput(this.sessionId, data);
      }
    });

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounceId);
      this.resizeDebounceId = setTimeout(() => this.syncTerminalSize(), 60);
    });
    this.resizeObserver.observe(this.terminalHost);
  }

  async restoreFocusedPaneSession(): Promise<void> {
    const focusedTab = this.workspace.getFocusedPaneTab();
    if (!focusedTab) {
      this.workspace.status = 'Focused pane does not have a tab assigned.';
      this.utility.appendOutput(this.workspace.status, 'warn');
      this.sessionInfo = null;
      await this.recreateTerminalSurface();
      return;
    }

    this.workspace.activeTabId = focusedTab.id;
    this.workspace.workingDirectory = focusedTab.cwd;
    await this.recreateTerminalSurface();
    await this.startTerminalSession(focusedTab);
  }

  async relaunchTerminal(): Promise<void> {
    const focusedTab = this.workspace.getFocusedPaneTab();
    if (!focusedTab) {
      return;
    }

    this.workspace.updateTabStatus(focusedTab.id, 'restarting');
    await this.startTerminalSession(focusedTab);
  }

  async interruptTerminal(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    await this.terminalBridge.interruptSession(this.sessionId);
    this.workspace.status = 'Sent interrupt signal to terminal.';
    this.utility.appendOutput(this.workspace.status, 'warn');
  }

  async killTerminal(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const focusedTab = this.workspace.getFocusedPaneTab();
    this.disposeTerminalSession();
    this.sessionInfo = null;
    void this.systemMonitor.refreshSessionEnvironment(undefined);
    this.workspace.status = 'Terminal session killed.';
    this.utility.appendOutput(this.workspace.status, 'warn');

    if (focusedTab) {
      this.workspace.updateTabStatus(focusedTab.id, 'stopped');
      await this.workspace.persistWorkspaceState();
    }
  }

  async rerunCommand(command: string): Promise<void> {
    if (!this.sessionId || !command.trim()) {
      return;
    }

    await this.terminalBridge.sendInput(this.sessionId, `${command}\r`);
    this.utility.appendOutput(`Re-ran command: ${command}`, 'info');
  }

  syncTerminalSize(): void {
    if (!this.sessionId || !this.terminal || !this.fitAddon) {
      return;
    }

    const sessionId = this.sessionId;
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.fitAddon?.fit();
        if (this.terminal && sessionId) {
          void this.terminalBridge.resizeSession(sessionId, this.terminal.cols, this.terminal.rows);
        }
      });
    });
  }

  dispose(): void {
    this.disposeTerminalSession();
    this.terminal?.dispose();
    this.resizeObserver?.disconnect();
    clearTimeout(this.resizeDebounceId);
  }

  private async startTerminalSession(tab?: RuntimeTab): Promise<void> {
    const focusedTab = tab || this.workspace.getFocusedPaneTab();
    const targetDirectory = focusedTab?.cwd?.trim() || this.workspace.workingDirectory.trim();
    if (!targetDirectory || !this.terminal || !this.fitAddon) {
      this.workspace.status = 'Working directory is required.';
      this.utility.appendOutput(this.workspace.status, 'warn');
      return;
    }

    this.workspace.status = `Launching terminal in ${targetDirectory}...`;
    this.utility.appendOutput(this.workspace.status, 'info');
    this.disposeTerminalSession();
    this.terminal.clear();
    this.terminal.reset();

    this.sessionId = await this.terminalBridge.createSession({
      cwd: targetDirectory,
      workspaceName: this.workspace.workspaceName,
      shell: focusedTab?.shell || '',
    });
    this.sessionInfo = await this.terminalBridge.getSessionInfo(this.sessionId);
    this.registerTerminalListeners();
    this.syncTerminalSize();
    await this.systemMonitor.refreshSessionEnvironment(this.sessionId);
    if (focusedTab) {
      this.workspace.updateTabStatus(focusedTab.id, 'running');
    }
    this.workspace.status = `Connected to ${targetDirectory}`;
    this.utility.appendOutput(`Terminal session attached to ${targetDirectory}`, 'info');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.runStartupCommands(focusedTab?.startupCommand);
  }

  private async runStartupCommands(commands?: string): Promise<void> {
    if (!commands?.trim() || !this.sessionId) {
      return;
    }

    const lines = commands
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      await this.terminalBridge.sendInput(this.sessionId, `${line}\r`);
      this.utility.appendOutput(`Ran startup command: ${line}`, 'info');
    }
  }

  private registerTerminalListeners(): void {
    this.removeInfoListener = this.terminalBridge.onInfo((event) => {
      if (event.id === this.sessionId) {
        this.sessionInfo = event;
      }
    });

    this.removeDataListener = this.terminalBridge.onData((event) => {
      if (event.id === this.sessionId) {
        this.ngZone.runOutsideAngular(() => this.terminal?.write(event.data));
        this.ngZone.run(() => {
          const focusedTab = this.workspace.getFocusedTab();
          const source = focusedTab?.title || this.workspace.workspaceName || 'Terminal';
          this.utility.scanOutputForProblems(event.data, source);
        });
      }
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      if (event.id === this.sessionId) {
        const focusedTab = this.workspace.getFocusedPaneTab();
        if (focusedTab) {
          this.workspace.updateTabStatus(focusedTab.id, 'stopped');
        }
        this.workspace.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
        this.utility.appendOutput(
          this.workspace.status,
          event.exitCode ? 'error' : 'info'
        );
      }
    });
  }

  private disposeTerminalSession(): void {
    this.removeInfoListener?.();
    this.removeDataListener?.();
    this.removeExitListener?.();
    this.removeInfoListener = undefined;
    this.removeDataListener = undefined;
    this.removeExitListener = undefined;

    if (this.sessionId) {
      void this.terminalBridge.disposeSession(this.sessionId);
      this.sessionId = undefined;
    }
  }

  private trackTerminalInput(data: string): void {
    for (const char of data) {
      if (char === '\r' || char === '\n') {
        this.commitTerminalInput();
        continue;
      }

      if (char === '\u007f') {
        this.terminalInputBuffer = this.terminalInputBuffer.slice(0, -1);
        continue;
      }

      if (char >= ' ' && char !== '\u007f') {
        this.terminalInputBuffer += char;
      }
    }
  }

  private commitTerminalInput(): void {
    const command = this.terminalInputBuffer.trim();
    this.terminalInputBuffer = '';

    if (!command) {
      return;
    }

    const focusedTab = this.workspace.getFocusedTab();
    this.utility.trackCommand(
      command,
      focusedTab?.title || this.workspace.workspaceName || 'Terminal'
    );
  }
}
