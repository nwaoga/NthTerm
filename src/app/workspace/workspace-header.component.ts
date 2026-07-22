import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TerminalNavigationComponent } from './terminal-navigation.component';
import { TerminalStackIndicatorComponent } from './terminal-stack-indicator.component';

@Component({
  selector: 'app-workspace-header',
  imports: [TerminalNavigationComponent, TerminalStackIndicatorComponent],
  template: `
    <header class="workspace-stack-header" (wheel)="onWheel($event)">
      <div class="workspace-stack-header-copy">
        <p class="rail-title">{{ workspaceName || 'Workspace' }}</p>
        <strong class="workspace-stack-terminal-name">{{ terminalName || 'No terminal' }}</strong>
      </div>

      <app-terminal-navigation
        [activeIndex]="activeIndex"
        [total]="total"
        [canNavigate]="total > 1"
        (previous)="previous.emit()"
        (next)="next.emit()"
      />

      <app-terminal-stack-indicator
        [terminalIds]="terminalIds"
        [activeIndex]="activeIndex"
        [total]="total"
        (select)="selectTerminal.emit($event)"
      />

      <div class="workspace-stack-header-actions">
        <div class="workspace-zoom-control" role="group" aria-label="Workspace zoom">
          <span class="workspace-zoom-label">Zoom</span>
          <div class="workspace-zoom-segment">
            <button
              type="button"
              class="workspace-zoom-button"
              [class.active]="!overviewActive"
              [attr.aria-pressed]="!overviewActive"
              aria-label="Zoom in to focus mode"
              title="Focus (Ctrl+\\\\)"
              (click)="setZoom.emit(0)"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="3.25" stroke="currentColor" stroke-width="1.35" />
                <path d="M9.4 9.4 13 13M5.5 7h3M7 5.5v3" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
              </svg>
              <span>In</span>
            </button>
            <button
              type="button"
              class="workspace-zoom-button"
              [class.active]="overviewActive"
              [attr.aria-pressed]="overviewActive"
              aria-label="Zoom out to overview"
              title="Overview (Ctrl+\\\\)"
              (click)="setZoom.emit(1)"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="3.25" stroke="currentColor" stroke-width="1.35" />
                <path d="M9.4 9.4 13 13M5.5 7h3" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
              </svg>
              <span>Out</span>
            </button>
          </div>
        </div>
        @if (showInspectorRestore) {
          <button
            type="button"
            class="inspector-restore-button"
            aria-label="Show inspector"
            title="Show inspector"
            (click)="restoreInspector.emit()"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2.5" y="3" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
              <path d="M9.5 3v10M5 6h2M5 8.5h2M5 11h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
          </button>
        }
      </div>
    </header>
  `,
})
export class WorkspaceHeaderComponent {
  @Input() workspaceName = '';
  @Input() terminalName = '';
  @Input() terminalIds: string[] = [];
  @Input() activeIndex = 0;
  @Input() total = 0;
  @Input() zoomLevel = 0;
  @Input() overviewActive = false;
  @Input() showInspectorRestore = false;

  @Output() readonly previous = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly selectTerminal = new EventEmitter<string>();
  @Output() readonly setZoom = new EventEmitter<number>();
  @Output() readonly chromeWheel = new EventEmitter<-1 | 1>();
  @Output() readonly restoreInspector = new EventEmitter<void>();

  protected onWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaY) < 8) {
      return;
    }
    event.preventDefault();
    this.chromeWheel.emit(event.deltaY > 0 ? 1 : -1);
  }
}
