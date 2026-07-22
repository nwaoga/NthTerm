import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-terminal-stack-indicator',
  template: `
    <div class="terminal-stack-indicator" role="tablist" aria-label="Terminal position">
      <span class="terminal-stack-count" aria-hidden="true">{{ activeIndex + 1 }} / {{ total }}</span>
      @for (id of terminalIds; track id; let index = $index) {
        <button
          type="button"
          class="terminal-stack-dot"
          role="tab"
          [class.active]="index === activeIndex"
          [attr.aria-selected]="index === activeIndex"
          [attr.aria-label]="'Terminal ' + (index + 1) + ' of ' + total"
          (click)="select.emit(id)"
        >
          {{ index + 1 }}
        </button>
      }
    </div>
  `,
})
export class TerminalStackIndicatorComponent {
  @Input({ required: true }) terminalIds: string[] = [];
  @Input() activeIndex = 0;
  @Input() total = 0;
  @Output() readonly select = new EventEmitter<string>();
}
