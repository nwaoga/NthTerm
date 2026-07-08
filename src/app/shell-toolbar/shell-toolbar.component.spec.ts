import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { ShellToolbarComponent } from './shell-toolbar.component';

describe('ShellToolbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellToolbarComponent],
      providers: [
        {
          provide: WorkspaceRuntimeService,
          useValue: {
            selectedWorkspace: 'Cloud POS',
            layoutMode: 'grid-2x2',
            runtimeTabs: [
              { id: 'tab-1', title: 'API' },
              { id: 'tab-2', title: 'Angular' },
            ],
            getFocusedTab: () => ({ id: 'tab-1', title: 'API' }),
            getActiveTabTerminals: () => [
              { id: 'terminal-1', cwd: 'C:\\api', shell: '', startupCommand: '', status: 'running', session: null },
            ],
          },
        },
      ],
    }).compileComponents();
  });

  it('emits create-tab and layout events from the toolbar controls', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const createSpy = jasmine.createSpy('createTabRequested');
    const layoutSpy = jasmine.createSpy('layoutModeChange');

    component.createTabRequested.subscribe(createSpy);
    component.layoutModeChange.subscribe(layoutSpy);
    fixture.detectChanges();

    const createButtons = fixture.debugElement.queryAll(By.css('.toolbar-pill-primary'));
    createButtons[0].nativeElement.click();
    fixture.debugElement.queryAll(By.css('.toolbar-pill-segment'))[0].nativeElement.click();

    expect(createSpy).toHaveBeenCalled();
    expect(layoutSpy).toHaveBeenCalledWith('grid-2');
  });

  it('emits command palette and settings actions', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const paletteSpy = jasmine.createSpy('commandPaletteRequested');
    const settingsSpy = jasmine.createSpy('settingsRequested');

    component.commandPaletteRequested.subscribe(paletteSpy);
    component.settingsRequested.subscribe(settingsSpy);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.toolbar-command')).nativeElement.click();
    fixture.debugElement.query(By.css('.toolbar-settings-button')).nativeElement.click();

    expect(paletteSpy).toHaveBeenCalled();
    expect(settingsSpy).toHaveBeenCalled();
  });

  it('does not render search or view-menu controls', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.toolbar-search'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.toolbar-view-menu-button'))).toBeNull();
  });

  it('emits create-terminal with the default shell from the split action', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const terminalSpy = jasmine.createSpy('createTerminalRequested');

    component.createTerminalRequested.subscribe(terminalSpy);
    fixture.detectChanges();

    const splitMain = fixture.debugElement.query(By.css('.split-action-main'));
    splitMain.nativeElement.click();

    expect(terminalSpy).toHaveBeenCalled();
  });

  it('emits create-terminal with an explicit shell from the shell menu', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const terminalSpy = jasmine.createSpy('createTerminalRequested');

    component.createTerminalRequested.subscribe(terminalSpy);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.split-action-menu')).nativeElement.click();
    fixture.detectChanges();

    const menuItems = fixture.debugElement.queryAll(By.css('.shell-menu-dropdown .view-menu-item'));
    menuItems[2].nativeElement.click();

    expect(terminalSpy).toHaveBeenCalledWith('cmd');
  });

  it('renders workspace summary context in the center band', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    const summary = fixture.debugElement.query(By.css('.toolbar-center-summary')).nativeElement
      .textContent;
    const layout = fixture.debugElement.query(By.css('.toolbar-meta-pill')).nativeElement
      .textContent;
    const contextLabel = fixture.debugElement.query(By.css('.workspace-context-label')).nativeElement
      .textContent;
    const contextBadge = fixture.debugElement.query(By.css('.workspace-context-badge')).nativeElement
      .textContent;

    expect(summary).toContain('2/5 tabs');
    expect(summary).toContain('API');
    expect(summary).toContain('1 shell');
    expect(layout).toContain('2x2');
    expect(contextLabel).toContain('Active Workspace');
    expect(contextBadge).toContain('Sidebar');
  });
});
