import { Component, inject } from '@angular/core';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
})
export class StatusBarComponent {
  protected readonly ws = inject(WorkspaceRuntimeService);
}
