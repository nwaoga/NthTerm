import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { TerminalBridgeService } from './terminal-bridge.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('terminalHost', { static: true })
  private terminalHost?: ElementRef<HTMLDivElement>;

  protected status = 'Starting terminal...';

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly terminalBridge = inject(TerminalBridgeService);

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private sessionId?: string;
  private resizeObserver?: ResizeObserver;

  async ngAfterViewInit(): Promise<void> {
    if (!this.terminalHost) {
      this.status = 'Terminal host was not found.';
      return;
    }

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
    this.terminal.open(this.terminalHost.nativeElement);
    this.fitTerminal();

    this.sessionId = await this.terminalBridge.createSession();
    this.status = 'Connected';

    this.terminal.onData((data) => {
      if (this.sessionId) {
        this.terminalBridge.sendInput(this.sessionId, data);
      }
    });

    const removeDataListener = this.terminalBridge.onData((event) => {
      if (event.id === this.sessionId) {
        this.ngZone.runOutsideAngular(() => this.terminal?.write(event.data));
      }
    });

    const removeExitListener = this.terminalBridge.onExit((event) => {
      if (event.id === this.sessionId) {
        this.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
      }
    });

    this.resizeObserver = new ResizeObserver(() => this.syncTerminalSize());
    this.resizeObserver.observe(this.terminalHost.nativeElement);
    this.syncTerminalSize();

    this.destroyRef.onDestroy(() => {
      removeDataListener();
      removeExitListener();
      this.resizeObserver?.disconnect();
      this.terminal?.dispose();

      if (this.sessionId) {
        void this.terminalBridge.disposeSession(this.sessionId);
      }
    });
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
    this.terminalBridge.resizeSession(this.sessionId, this.terminal.cols, this.terminal.rows);
  }
}
