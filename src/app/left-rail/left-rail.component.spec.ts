import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { LeftRailComponent } from './left-rail.component';

describe('LeftRailComponent', () => {
  const workspaceService = {
    sessions: [
      { id: 'ws-1', name: 'Cloud POS', icon: 'cloud', accent: 'violet' },
      { id: 'ws-2', name: 'MomentTrace', icon: 'spark', accent: 'blue' },
    ],
    editingSessionId: null,
    editingSessionName: '',
    startRenameSession: jasmine.createSpy('startRenameSession'),
    cancelRenameSession: jasmine.createSpy('cancelRenameSession'),
    isSessionActive: (session: { id: string }) => session.id === 'ws-1',
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

  it('emits workspace selection when a session row is clicked', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const selectedSpy = jasmine.createSpy('workspaceSelected');

    component.workspaceSelected.subscribe(selectedSpy);
    fixture.detectChanges();

    const sessionButtons = fixture.debugElement.queryAll(By.css('.session-item'));
    sessionButtons[1].nativeElement.click();

    expect(selectedSpy).toHaveBeenCalledWith('ws-2');
  });

  it('emits template and preference events from sidebar controls', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const templateSpy = jasmine.createSpy('templateSelected');
    const toggleSpy = jasmine.createSpy('preferencesToggle');
    const panelPreferenceSpy = jasmine.createSpy('utilityPanelPreferenceChange');
    const startModeSpy = jasmine.createSpy('newSessionStartModeChange');

    component.preferencesOpen = true;
    component.utilityPanelVisible = true;
    component.newSessionStartMode = 'focused-tab';
    component.templateSelected.subscribe(templateSpy);
    component.preferencesToggle.subscribe(toggleSpy);
    component.utilityPanelPreferenceChange.subscribe(panelPreferenceSpy);
    component.newSessionStartModeChange.subscribe(startModeSpy);
    fixture.detectChanges();

    const templateButton = fixture.debugElement.query(By.css('.template-item'));
    templateButton.nativeElement.click();

    const appearanceButton = fixture.debugElement.query(By.css('.tool-button'));
    appearanceButton.nativeElement.click();

    const checkbox = fixture.debugElement.query(By.css('.preference-toggle input'));
    checkbox.nativeElement.checked = false;
    checkbox.nativeElement.dispatchEvent(new Event('change'));

    const select = fixture.debugElement.query(By.css('.preference-select'));
    select.nativeElement.value = 'home';
    select.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(templateSpy).toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalled();
    expect(panelPreferenceSpy).toHaveBeenCalledWith(false);
    expect(startModeSpy).toHaveBeenCalledWith('home');
  });

  it('emits a new session request from the new session button', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const newSessionSpy = jasmine.createSpy('newSessionRequested');

    component.newSessionRequested.subscribe(newSessionSpy);
    fixture.detectChanges();

    const createButton = fixture.debugElement.query(By.css('.rail-create-button'));
    createButton.nativeElement.click();

    expect(newSessionSpy).toHaveBeenCalled();
  });

  it('emits custom path changes when the custom start mode is active', () => {
    const fixture = TestBed.createComponent(LeftRailComponent);
    const component = fixture.componentInstance;
    const customPathSpy = jasmine.createSpy('newSessionCustomPathChange');

    component.preferencesOpen = true;
    component.newSessionStartMode = 'custom';
    component.newSessionCustomPath = '';
    component.newSessionCustomPathChange.subscribe(customPathSpy);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('.preference-input'));
    input.nativeElement.value = 'D:\\Workspaces\\NthTerm';
    input.nativeElement.dispatchEvent(new Event('input'));

    expect(customPathSpy).toHaveBeenCalledWith('D:\\Workspaces\\NthTerm');
  });
});
