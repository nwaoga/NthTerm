import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-terminal-navigation',
  template: `
    <div class="terminal-navigation" role="group" aria-label="Terminal navigation">
      <button
        type="button"
        class="terminal-nav-button"
        aria-label="Previous terminal"
        title="Previous terminal (Ctrl+[)"
        [disabled]="!canNavigate"
        (click)="previous.emit()"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="terminal-nav-label">Terminal {{ activeIndex + 1 }} of {{ total }}</span>
      <button
        type="button"
        class="terminal-nav-button"
        aria-label="Next terminal"
        title="Next terminal (Ctrl+])"
        [disabled]="!canNavigate"
        (click)="next.emit()"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  `,
})
export class TerminalNavigationComponent {
  @Input() activeIndex = 0;
  @Input() total = 0;
  @Input() canNavigate = false;
  @Output() readonly previous = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<void>();
}
