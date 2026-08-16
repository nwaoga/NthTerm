import { TestBed } from '@angular/core/testing';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { StatusBarComponent } from './status-bar.component';

describe('StatusBarComponent', () => {
  const workspaceService = {
    workspaceName: 'Studio Stack',
    terminals: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
      providers: [
        {
          provide: WorkspaceRuntimeService,
          useValue: workspaceService,
        },
      ],
    }).compileComponents();
  });

  it('shows workspace name and terminal count without placeholder chrome', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Studio Stack');
    expect(text).toContain('4 terminals');
    expect(text).not.toContain('Connected');
    expect(text).not.toContain('Ln 12');
    expect(text).not.toContain('UTF-8');
    expect(text).not.toContain('CRLF');
    expect(fixture.nativeElement.querySelector('.dot')).toBeNull();
  });
});
