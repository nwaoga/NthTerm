import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { RuntimeTerminal } from '../models';
import { AppPreferencesService } from '../preferences/app-preferences.service';
import { resolveTerminalTheme } from '../terminal/terminal-theme.util';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { WorkspaceRuntimeService } from './workspace-runtime.service';
import { TerminalPreviewCardComponent } from './terminal-preview-card.component';

@Component({
  selector: 'app-terminal-overview',
  imports: [TerminalPreviewCardComponent],
  template: `
    <section
      class="terminal-overview"
      [attr.data-terminal-count]="terminals.length"
      [style.--overview-columns]="columnCount"
      aria-label="Terminal overview"
    >
      <div class="terminal-overview-grid">
        @for (terminal of terminals; track terminal.id; let index = $index) {
          <app-terminal-preview-card
            [terminal]="terminal"
            [index]="index"
            [title]="ws.getTerminalDisplayTitle(terminal, index)"
            [summary]="ws.getTerminalSummaryLine(terminal)"
            [statusLabel]="ws.getTerminalStatusLabel(terminal)"
            [tone]="ws.getTerminalTone(terminal)"
            [running]="ws.isTerminalRunning(terminal)"
            [active]="terminal.id === activeTerminalId"
            [bufferPreview]="getBufferPreview(terminal)"
            [renaming]="editingTerminalId === terminal.id"
            [draftName]="editingTerminalName"
            [foreground]="getTerminalForeground(terminal)"
            [background]="getTerminalBackground(terminal)"
            (draftNameChange)="editingTerminalNameChange.emit($event)"
            (select)="select.emit($event)"
            (openMenu)="openMenu.emit($event)"
            (startRenameRequest)="startRename.emit($event)"
            (commitRenameRequest)="commitRename.emit()"
            (cancelRename)="cancelRename.emit()"
          />
        }
      </div>
    </section>
  `,
})
export class TerminalOverviewComponent {
  @Input() terminals: RuntimeTerminal[] = [];
  @Input() activeTerminalId = '';
  @Input() editingTerminalId = '';
  @Input() editingTerminalName = '';

  @Output() readonly select = new EventEmitter<string>();
  @Output() readonly openMenu = new EventEmitter<{ terminalId: string; event: MouseEvent }>();
  @Output() readonly startRename = new EventEmitter<string>();
  @Output() readonly commitRename = new EventEmitter<void>();
  @Output() readonly cancelRename = new EventEmitter<void>();
  @Output() readonly editingTerminalNameChange = new EventEmitter<string>();

  protected readonly ws = inject(WorkspaceRuntimeService);
  private readonly terminalSessions = inject(TerminalSessionService);
  private readonly preferences = inject(AppPreferencesService);

  protected get columnCount(): number {
    const count = this.terminals.length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 5;
  }

  protected getTerminalForeground(terminal: RuntimeTerminal): string {
    return resolveTerminalTheme(terminal.theme ?? null, this.preferences.readDefaultTerminalTheme())
      .foreground;
  }

  protected getTerminalBackground(terminal: RuntimeTerminal): string {
    return resolveTerminalTheme(terminal.theme ?? null, this.preferences.readDefaultTerminalTheme())
      .background;
  }

  protected getBufferPreview(terminal: RuntimeTerminal): string {
    void this.terminalSessions.getPreviewVersion();
    if (this.ws.shouldRenderTerminalPreview(terminal)) {
      return this.ws.getTerminalPreviewText(terminal);
    }
    return this.terminalSessions.getBufferPreview(terminal.id);
  }
}
