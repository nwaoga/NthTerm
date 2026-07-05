import { Injectable, inject } from '@angular/core';

import { TerminalSessionService } from '../terminal/terminal-session.service';

@Injectable({ providedIn: 'root' })
export class TerminalHostCoordinatorService {
  private hostResolver?: () => Map<string, HTMLElement>;
  private detectChanges?: () => void;
  private restoreChain = Promise.resolve();

  private readonly terminal = inject(TerminalSessionService);

  registerHostResolver(resolver: () => Map<string, HTMLElement>, detectChanges?: () => void): void {
    this.hostResolver = resolver;
    this.detectChanges = detectChanges;
  }

  syncAndRestore(): Promise<void> {
    const run = this.restoreChain.then(() => this.runSyncAndRestore());
    this.restoreChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async runSyncAndRestore(): Promise<void> {
    this.detectChanges?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.terminal.setTerminalHosts(this.hostResolver?.() || new Map());
    await this.terminal.restorePaneSessions();
  }
}
