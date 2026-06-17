import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { TerminalBridgeService } from './terminal-bridge.service';
import { SavedWorkspace, WorkspaceBridgeService } from './workspace-bridge.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('terminalHost', { static: true })
  private terminalHost?: ElementRef<HTMLDivElement>;

  protected status = 'Loading workspace...';
  protected workspaceName = 'Default Workspace';
  protected workingDirectory = '';
  protected lastSavedAt = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly terminalBridge = inject(TerminalBridgeService);
  private readonly workspaceBridge = inject(WorkspaceBridgeService);

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private sessionId?: string;
  private resizeObserver?: ResizeObserver;
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;

  async ngAfterViewInit(): Promise<void> {
    if (!this.terminalHost) {
      this.status = 'Terminal host was not found.';
      return;
    }

    this.createTerminalSurface();

    const workspace = await this.workspaceBridge.getDefaultWorkspace();
    this.applyWorkspace(workspace);
    await this.startTerminalSession(workspace.cwd);

    this.resizeObserver = new ResizeObserver(() => this.syncTerminalSize());
    this.resizeObserver.observe(this.terminalHost.nativeElement);

    this.destroyRef.onDestroy(() => {
      this.removeDataListener?.();
      this.removeExitListener?.();
      this.resizeObserver?.disconnect();
      this.terminal?.dispose();

      if (this.sessionId) {
        void this.terminalBridge.disposeSession(this.sessionId);
      }
    });
  }

  protected async saveWorkspace(): Promise<void> {
    const saved = await this.workspaceBridge.saveDefaultWorkspace({
      name: this.workspaceName.trim() || 'Default Workspace',
      cwd: this.workingDirectory.trim(),
    });

    this.applyWorkspace(saved);
    this.status = `Saved workspace to ${saved.cwd}`;
  }

  protected async restoreWorkspace(): Promise<void> {
    const saved = await this.workspaceBridge.getDefaultWorkspace();
    this.applyWorkspace(saved);
    await this.startTerminalSession(saved.cwd);
  }

  protected async relaunchTerminal(): Promise<void> {
    await this.startTerminalSession(this.workingDirectory.trim());
  }

  private createTerminalSurface(): void {
    this.fitAddon = new FitAddon();
    this.terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#0f1720',
        foreground: '#d8e1e8',
        cursor: '#7dd3fc',
        selectionBackground: '#1f3b53',
      },
    });

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalHost!.nativeElement);

    this.terminal.onData((data) => {
      if (this.sessionId) {
        void this.terminalBridge.sendInput(this.sessionId, data);
      }
    });
  }

  private async startTerminalSession(cwd: string): Promise<void> {
    const targetDirectory = cwd.trim();
    if (!targetDirectory) {
      this.status = 'Working directory is required.';
      return;
    }

    this.status = `Launching terminal in ${targetDirectory}...`;

    if (this.sessionId) {
      await this.terminalBridge.disposeSession(this.sessionId);
      this.sessionId = undefined;
    }

    this.removeDataListener?.();
    this.removeExitListener?.();

    this.terminal?.clear();
    this.terminal?.reset();

    this.sessionId = await this.terminalBridge.createSession({ cwd: targetDirectory });
    this.registerTerminalListeners();
    this.syncTerminalSize();
    this.status = `Connected to ${targetDirectory}`;
  }

  private registerTerminalListeners(): void {
    this.removeDataListener = this.terminalBridge.onData((event) => {
      if (event.id === this.sessionId) {
        this.ngZone.runOutsideAngular(() => this.terminal?.write(event.data));
      }
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      if (event.id === this.sessionId) {
        this.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
      }
    });
  }

  private applyWorkspace(workspace: SavedWorkspace): void {
    this.workspaceName = workspace.name;
    this.workingDirectory = workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
  }

  private fitTerminal(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.fitAddon?.fit());
    });
  }

  private syncTerminalSize(): void {
    if (!this.sessionId || !this.terminal || !this.fitAddon) {
      return;
    }

    this.fitTerminal();
    void this.terminalBridge.resizeSession(this.sessionId, this.terminal.cols, this.terminal.rows);
  }
}
