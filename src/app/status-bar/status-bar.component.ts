import { Component, inject } from '@angular/core';

import { resolveShellOptionLabel } from '../models';
import { resolveHostPlatform } from '../platform/host-platform';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
})
export class StatusBarComponent {
  protected readonly ws = inject(WorkspaceRuntimeService);
  private readonly hostPlatform = resolveHostPlatform();

  protected getLineEndingLabel(): 'CRLF' | 'LF' {
    return this.hostPlatform === 'win32' ? 'CRLF' : 'LF';
  }

  protected getFocusedShellLabel(): string {
    const shell = this.ws.getFocusedTerminal()?.session?.shell?.trim();
    if (shell) {
      return resolveShellOptionLabel(shell, this.ws.wslDistros);
    }

    return this.ws.getFocusedTerminalShellLabel();
  }
}
