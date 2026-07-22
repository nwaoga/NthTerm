import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeTerminal } from '../models';
import { TerminalPreviewCardComponent } from './terminal-preview-card.component';

describe('TerminalPreviewCardComponent', () => {
  let fixture: ComponentFixture<TerminalPreviewCardComponent>;
  let component: TerminalPreviewCardComponent;

  const terminal: RuntimeTerminal = {
    id: 'term-1',
    name: 'Build',
    cwd: '/repo',
    shell: 'pwsh',
    startupCommand: 'npm test',
    status: 'running',
    theme: { foreground: '#ffeedd', background: '#112233' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalPreviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalPreviewCardComponent);
    component = fixture.componentInstance;
    component.terminal = terminal;
    component.index = 0;
    component.title = 'Build';
    component.foreground = '#ffeedd';
    component.background = '#112233';
    component.bufferPreview = 'npm test\nPASS';
    fixture.detectChanges();
  });

  it('applies terminal theme colors to the preview buffer', () => {
    const buffer = fixture.nativeElement.querySelector('.terminal-preview-buffer') as HTMLElement;

    expect(buffer.style.getPropertyValue('--terminal-surface-bg').trim()).toBe('#112233');
    expect(buffer.style.getPropertyValue('--terminal-surface-fg').trim()).toBe('#ffeedd');
  });
});
