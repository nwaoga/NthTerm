import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PaletteEntry } from '../models';
import { CommandPaletteService } from './command-palette.service';

@Component({
  selector: 'app-command-palette',
  imports: [FormsModule],
  templateUrl: './command-palette.component.html',
})
export class CommandPaletteComponent {
  @ViewChild('paletteInput') private paletteInput?: ElementRef<HTMLInputElement>;

  @Output() readonly closed = new EventEmitter<void>();

  protected readonly palette = inject(CommandPaletteService);

  @HostListener('document:keydown', ['$event'])
  protected handleGlobalKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const withCtrl = event.ctrlKey || event.metaKey;
    if (withCtrl && event.shiftKey && key === 'p') {
      event.preventDefault();
      this.open();
      return;
    }
    if (!this.palette.open) return;
    const entries = this.palette.getFilteredEntries();
    if (key === 'escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (key === 'arrowdown') {
      event.preventDefault();
      this.palette.moveSelection('down');
      return;
    }
    if (key === 'arrowup') {
      event.preventDefault();
      this.palette.moveSelection('up');
      return;
    }
    if (key === 'enter' && entries.length) {
      event.preventDefault();
      void this.palette.executeEntry(entries[this.palette.index]);
    }
  }

  open(focusSearch = false): void {
    this.palette.openPalette(focusSearch);
    setTimeout(() => {
      this.paletteInput?.nativeElement.focus();
      this.paletteInput?.nativeElement.select();
    });
  }

  close(): void {
    this.palette.close();
    this.closed.emit();
  }

  protected onQueryChange(): void {
    this.palette.onQueryChange();
  }

  protected getFilteredPaletteEntries(): PaletteEntry[] {
    return this.palette.getFilteredEntries();
  }

  protected isPaletteEntryActive(index: number): boolean {
    return this.palette.isEntryActive(index);
  }

  protected async executePaletteEntry(entry: PaletteEntry): Promise<void> {
    await this.palette.executeEntry(entry);
  }
}
