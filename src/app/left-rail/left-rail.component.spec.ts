import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { LeftRailComponent } from './left-rail.component';

describe('LeftRailComponent', () => {
  const workspaceService = {
    workspaces: [
      { id: 'ws-1', name: 'Cloud POS', icon: 'cloud', accent: 'violet' },
      { id: 'ws-2', name: 'MomentTrace', icon: 'spark', accent: 'blue' },
    ],
    editingWorkspaceId: null,
    editingWorkspaceName: '',
    startRenameWorkspace: jasmine.createSpy('startRenameWorkspace'),
    cancelRenameWorkspace: jasmine.createSpy('cancelRenameWorkspace'),
    isWorkspaceActive: (workspace: { id: string }) => workspace.id === 'ws-1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftRailComponent],
      providers: [
        {
          provide: WorkspaceRuntimeService,
          useValue: workspaceService,
        },
      ],
    }).compileComponents();
  });

  it('emits workspace selection when a workspace row is clicked', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const selectedSpy = jasmine.createSpy('workspaceSelected');

    component.workspaceSelected.subscribe(selectedSpy);
    fixture.detectChanges();

    const sessionButtons = fixture.debugElement.queryAll(By.css('.session-item'));
    sessionButtons[1].nativeElement.click();

    expect(selectedSpy).toHaveBeenCalledWith('ws-2');
  });

  it('does not render a templates section in the left rail', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Templates');
    expect(fixture.nativeElement.querySelector('.template-item')).toBeNull();
  });

  it('does not render settings in the left rail', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Settings');
    expect(fixture.nativeElement.textContent).not.toContain('Appearance');
    expect(fixture.nativeElement.querySelector('.preferences-card')).toBeNull();
  });

  it('does not render inactive tool placeholders', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Command History');
    expect(fixture.nativeElement.textContent).not.toContain('Snippets');
    expect(fixture.nativeElement.textContent).not.toContain('Environments');
  });

  it('emits a new workspace request from the new workspace button', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const newSessionSpy = jasmine.createSpy('newSessionRequested');

    component.newSessionRequested.subscribe(newSessionSpy);
    fixture.detectChanges();

    const createButton = fixture.debugElement.query(By.css('.rail-create-button'));
    createButton.nativeElement.click();

    expect(newSessionSpy).toHaveBeenCalled();
  });
});
