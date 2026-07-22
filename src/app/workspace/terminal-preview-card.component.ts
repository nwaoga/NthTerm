import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RuntimeTerminal } from '../models';

@Component({
  selector: 'app-terminal-preview-card',
  imports: [FormsModule],
  template: `
    <article
      class="terminal-preview-card"
      [class.active]="active"
      [attr.data-terminal-id]="terminal.id"
      [attr.data-tone]="tone"
      role="button"
      tabindex="0"
      [attr.aria-label]="'Focus terminal ' + (index + 1) + ': ' + title"
      (click)="onCardClick()"
      (keydown.enter)="onCardClick()"
      (keydown.space)="$event.preventDefault(); onCardClick()"
      (contextmenu)="openMenu.emit({ terminalId: terminal.id, event: $event })"
    >
      <header class="terminal-preview-card-header">
        <div class="terminal-card-identity">
          <span class="terminal-preview-number">{{ index + 1 }}</span>
          <span class="terminal-state-dot" [class.running]="running" [attr.aria-label]="statusLabel"></span>
          @if (renaming) {
            <input
              #renameInput
              class="terminal-rename-input"
              type="text"
              maxlength="48"
              aria-label="Terminal name"
              [ngModel]="draftName"
              (ngModelChange)="draftNameChange.emit($event)"
              (keydown.enter)="commitRename()"
              (keydown.escape)="cancelRename.emit(); $event.stopPropagation()"
              (blur)="commitRename()"
              (click)="$event.stopPropagation()"
              (dblclick)="$event.stopPropagation()"
            />
          } @else {
            <button
              type="button"
              class="terminal-title-button"
              [attr.title]="'Double-click to rename ' + title"
              (click)="$event.stopPropagation()"
              (dblclick)="startRename($event)"
            >
              <strong>{{ title }}</strong>
            </button>
          }
        </div>
        <button
          type="button"
          class="card-action-icon"
          aria-label="Terminal actions"
          title="Terminal actions"
          (click)="openMenu.emit({ terminalId: terminal.id, event: $event }); $event.stopPropagation()"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="4" cy="8" r="1" fill="currentColor" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <circle cx="12" cy="8" r="1" fill="currentColor" />
          </svg>
        </button>
      </header>

      <p class="terminal-preview-meta">
        <span>{{ statusLabel }}</span>
        <span>{{ summary }}</span>
      </p>

      <pre
        class="terminal-preview-buffer"
        aria-hidden="true"
        [style.--terminal-surface-bg]="background"
        [style.--terminal-surface-fg]="foreground"
      >{{ bufferPreview || 'No recent output' }}</pre>
    </article>
  `,
})
export class TerminalPreviewCardComponent implements AfterViewChecked {
  @ViewChild('renameInput') private renameInput?: ElementRef<HTMLInputElement>;

  @Input({ required: true }) terminal!: RuntimeTerminal;
  @Input() index = 0;
  @Input() title = '';
  @Input() summary = '';
  @Input() statusLabel = '';
  @Input() tone = '';
  @Input() running = false;
  @Input() active = false;
  @Input() bufferPreview = '';
  @Input() renaming = false;
  @Input() draftName = '';
  @Input() foreground = '#d8e1e8';
  @Input() background = '#0d1320';

  @Output() readonly draftNameChange = new EventEmitter<string>();
  @Output() readonly select = new EventEmitter<string>();
  @Output() readonly openMenu = new EventEmitter<{ terminalId: string; event: MouseEvent }>();
  @Output() readonly startRenameRequest = new EventEmitter<string>();
  @Output() readonly commitRenameRequest = new EventEmitter<void>();
  @Output() readonly cancelRename = new EventEmitter<void>();

  private shouldFocusRename = false;

  ngAfterViewChecked(): void {
    if (this.shouldFocusRename && this.renameInput?.nativeElement) {
      this.shouldFocusRename = false;
      const input = this.renameInput.nativeElement;
      input.focus();
      input.select();
    }
  }

  protected onCardClick(): void {
    if (this.renaming) {
      return;
    }
    this.select.emit(this.terminal.id);
  }

  protected startRename(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.shouldFocusRename = true;
    this.startRenameRequest.emit(this.terminal.id);
  }

  protected commitRename(): void {
    this.commitRenameRequest.emit();
  }
}
