import { Injectable, inject } from '@angular/core';

import { TerminalSessionService } from '../terminal/terminal-session.service';

@Injectable({ providedIn: 'root' })
export class TerminalHostCoordinatorService {
  private hostResolver?: () => Map<string, HTMLElement>;
  private detectChanges?: () => void;

  private readonly terminal = inject(TerminalSessionService);

  registerHostResolver(resolver: () => Map<string, HTMLElement>, detectChanges?: () => void): void {
    this.hostResolver = resolver;
    this.detectChanges = detectChanges;
  }

  async syncAndRestore(): Promise<void> {
    this.detectChanges?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.terminal.setTerminalHosts(this.hostResolver?.() || new Map());
    await this.terminal.restorePaneSessions();
  }
}
