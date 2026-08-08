import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { StatusBarComponent } from './status-bar.component';

describe('StatusBarComponent', () => {
  const originalDesktop = window.nthTermDesktop;

  beforeEach(async () => {
    window.nthTermDesktop = { ...(originalDesktop || {}), platform: 'darwin' };
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
      providers: [
        {
          provide: WorkspaceRuntimeService,
          useValue: {
            workspaceName: 'Cloud POS',
            terminals: [{ id: 'terminal-1' }],
            wslDistros: [],
            getFocusedTerminal: () => ({ session: { shell: 'zsh' } }),
            getFocusedTerminalShellLabel: () => 'System Default',
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    window.nthTermDesktop = originalDesktop;
  });

  it('shows the active session shell and macOS line ending', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Zsh');
    expect(text).toContain('LF');
    expect(text).not.toContain('PowerShell');
    expect(text).not.toContain('CRLF');
  });
});
