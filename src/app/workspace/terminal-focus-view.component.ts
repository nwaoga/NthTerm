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
  selector: 'app-terminal-focus-view',
  imports: [FormsModule],
  template: `
    <section
      class="terminal-focus-view"
      [class.terminal-focus-view-stacked]="total > 1"
      [attr.data-terminal-count]="total"
      (wheel)="onChromeWheel($event)"
    >
      @if (total > 1) {
        <div class="terminal-stack-layers" aria-hidden="true">
          <div class="terminal-stack-layer terminal-stack-layer-2"></div>
          <div class="terminal-stack-layer terminal-stack-layer-1"></div>
        </div>
      }

      <article
        class="terminal-focus-card"
        [attr.data-terminal-id]="activeTerminal?.id"
        [attr.data-tone]="tone"
        (contextmenu)="contextMenu.emit($event)"
      >
        <header class="terminal-focus-card-header">
          <div class="terminal-card-identity">
            <span class="terminal-state-dot" [class.running]="running" [attr.aria-label]="statusLabel"></span>
            @if (renaming && activeTerminal) {
              <input
                #renameInput
                class="terminal-rename-input"
                type="text"
                maxlength="48"
                aria-label="Terminal name"
                [ngModel]="draftName"
                (ngModelChange)="draftNameChange.emit($event)"
                (keydown.enter)="commitRename()"
                (keydown.escape)="cancelRename.emit()"
                (blur)="commitRename()"
                (click)="$event.stopPropagation()"
              />
            } @else {
              <button
                type="button"
                class="terminal-title-button"
                [attr.title]="'Double-click to rename ' + title"
                (dblclick)="startRename()"
              >
                <strong>{{ title }}</strong>
              </button>
            }
            <span class="pane-summary-inline">{{ summary }}</span>
          </div>
          <div class="card-actions">
            @if (canAdd) {
              <button
                type="button"
                class="card-action-icon"
                aria-label="Add terminal"
                title="Add terminal"
                (click)="addTerminal.emit(); $event.stopPropagation()"
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2.5" y="3" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                  <path d="M8 3v10M10.5 8h2M11.5 7v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                </svg>
              </button>
            }
            <button
              type="button"
              class="card-action-icon"
              aria-label="Terminal actions"
              title="Terminal actions"
              (click)="openMenu.emit($event)"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="4" cy="8" r="1" fill="currentColor" />
                <circle cx="8" cy="8" r="1" fill="currentColor" />
                <circle cx="12" cy="8" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </header>

        <div class="terminal-focus-card-body">
          <div
            #viewportHost
            class="terminal-host terminal-viewport-host"
            [attr.data-terminal-host]="activeTerminal?.id"
            data-terminal-interactive="true"
            aria-label="Interactive terminal"
            (mousedown)="hostClick.emit($event)"
          >
            @if (showPreview) {
              <pre class="terminal-preview">{{ previewText }}</pre>
            }
          </div>
        </div>
      </article>
    </section>
  `,
})
export class TerminalFocusViewComponent implements AfterViewChecked {
  @ViewChild('viewportHost') viewportHost?: ElementRef<HTMLElement>;
  @ViewChild('renameInput') private renameInput?: ElementRef<HTMLInputElement>;

  @Input() activeTerminal: RuntimeTerminal | null = null;
  @Input() title = '';
  @Input() summary = '';
  @Input() statusLabel = '';
  @Input() tone = '';
  @Input() running = false;
  @Input() total = 0;
  @Input() canAdd = false;
  @Input() showPreview = false;
  @Input() previewText = '';
  @Input() renaming = false;
  @Input() draftName = '';

  @Output() readonly draftNameChange = new EventEmitter<string>();
  @Output() readonly addTerminal = new EventEmitter<void>();
  @Output() readonly openMenu = new EventEmitter<MouseEvent>();
  @Output() readonly contextMenu = new EventEmitter<MouseEvent>();
  @Output() readonly hostClick = new EventEmitter<MouseEvent>();
  @Output() readonly chromeWheel = new EventEmitter<-1 | 1>();
  @Output() readonly startRenameRequest = new EventEmitter<string>();
  @Output() readonly commitRenameRequest = new EventEmitter<void>();
  @Output() readonly cancelRename = new EventEmitter<void>();

  private shouldFocusRename = false;

  getHostElement(): HTMLElement | null {
    return this.viewportHost?.nativeElement ?? null;
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusRename && this.renameInput?.nativeElement) {
      this.shouldFocusRename = false;
      const input = this.renameInput.nativeElement;
      input.focus();
      input.select();
    }
  }

  protected startRename(): void {
    if (!this.activeTerminal) {
      return;
    }
    this.shouldFocusRename = true;
    this.startRenameRequest.emit(this.activeTerminal.id);
  }

  protected commitRename(): void {
    this.commitRenameRequest.emit();
  }

  protected onChromeWheel(event: WheelEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.terminal-viewport-host .xterm')) {
      return;
    }
    if (Math.abs(event.deltaY) < 8) {
      return;
    }
    event.preventDefault();
    this.chromeWheel.emit(event.deltaY > 0 ? 1 : -1);
  }
}
