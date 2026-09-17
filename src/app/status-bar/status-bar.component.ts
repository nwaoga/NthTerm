import { Component, inject } from '@angular/core';

import { UpdateNotifierService } from '../updates/update-notifier.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
})
export class StatusBarComponent {
  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly updates = inject(UpdateNotifierService);

  protected restartToUpdate(): void {
    void this.updates.restartToUpdate();
  }
}
