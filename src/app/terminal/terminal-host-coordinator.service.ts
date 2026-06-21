import { Injectable, inject } from '@angular/core';

import { TerminalSessionService } from '../terminal/terminal-session.service';

@Injectable({ providedIn: 'root' })
export class TerminalHostCoordinatorService {
  private hostResolver?: () => HTMLElement | undefined;
  private detectChanges?: () => void;

  private readonly terminal = inject(TerminalSessionService);

  registerHostResolver(resolver: () => HTMLElement | undefined, detectChanges?: () => void): void {
    this.hostResolver = resolver;
    this.detectChanges = detectChanges;
  }

  async syncAndRestore(): Promise<void> {
    this.detectChanges?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.terminal.setTerminalHost(this.hostResolver?.());
    await this.terminal.restoreFocusedPaneSession();
  }
}
