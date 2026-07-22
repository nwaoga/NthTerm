import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { ShellToolbarComponent } from './shell-toolbar.component';

describe('ShellToolbarComponent', () => {
  let activeTerminals: Array<Record<string, unknown>>;

  beforeEach(async () => {
    activeTerminals = [
      { id: 'terminal-1', cwd: 'C:\\api', shell: '', startupCommand: '', status: 'running', session: null },
    ];
    await TestBed.configureTestingModule({
      imports: [ShellToolbarComponent],
      providers: [
        {
          provide: WorkspaceRuntimeService,
          useValue: {
            selectedWorkspace: 'Cloud POS',
            workspaceName: 'Cloud POS',
            layoutMode: 'grid-2x2',
            terminals: activeTerminals,
            getActiveTabTerminals: () => activeTerminals,
            getShellOptions: () => [
              { value: '', label: 'System Default' },
              { value: 'powershell', label: 'PowerShell' },
              { value: 'cmd', label: 'Command Prompt' },
              { value: 'wsl:Ubuntu', label: 'WSL: Ubuntu' },
            ],
          },
        },
      ],
    }).compileComponents();
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

  it('omits manual layout and inactive profile controls', () => {
    activeTerminals.push({ id: 'terminal-2' });
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.layout-switch'))).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('2-Up');
    expect(fixture.nativeElement.textContent).not.toContain('2x2');
    expect(fixture.debugElement.query(By.css('[aria-label="Command palette"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('[aria-label="Profile"]'))).toBeNull();
  });

  it('does not render search or view-menu controls', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.toolbar-search'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.toolbar-view-menu-button'))).toBeNull();
  });

  it('emits create-terminal without a shell from the split action', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const terminalSpy = jasmine.createSpy('createTerminalRequested');

    component.createTerminalRequested.subscribe(terminalSpy);
    fixture.detectChanges();

    const splitMain = fixture.debugElement.query(By.css('.split-action-main'));
    splitMain.nativeElement.click();

    expect(terminalSpy).toHaveBeenCalledWith(undefined);
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

  it('renders discovered WSL distros in the shell menu', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.split-action-menu')).nativeElement.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('WSL: Ubuntu');
  });

  it('renders workspace summary context in the center band', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    const summary = fixture.debugElement.query(By.css('.toolbar-center-summary')).nativeElement
      .textContent;
    const context = fixture.debugElement.query(By.css('.desktop-workspace-context')).nativeElement
      .textContent;

    expect(summary).toContain('1/10 terminal');
    expect(context).toContain('Workspace');
    expect(context).toContain('Cloud POS');
    expect(context).toContain('1/10 terminal');
    expect(context).not.toContain('Tab');
  });

  it('uses start and add language without exposing manual layouts', () => {
    activeTerminals = [];
    const emptyFixture = TestBed.createComponent(ShellToolbarComponent);
    emptyFixture.detectChanges();

    expect(emptyFixture.debugElement.query(By.css('.split-action-main')).nativeElement.textContent).toContain('Start Terminal');
    expect(emptyFixture.debugElement.query(By.css('.layout-switch'))).toBeNull();

    activeTerminals = [{ id: 'terminal-1' }];
    const singleFixture = TestBed.createComponent(ShellToolbarComponent);
    singleFixture.detectChanges();

    expect(singleFixture.debugElement.query(By.css('.split-action-main')).nativeElement.textContent).toContain('Add Terminal');
    expect(singleFixture.debugElement.query(By.css('.layout-switch'))).toBeNull();

    activeTerminals.push({ id: 'terminal-2' });
    singleFixture.detectChanges();
    expect(singleFixture.debugElement.query(By.css('.layout-switch'))).toBeNull();
  });

  it('does not render a New Tab control', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('New Tab');
    expect(fixture.debugElement.query(By.css('[aria-label="New tab"]'))).toBeNull();
  });

  it('applies Windows caption spacing without decorative traffic lights', () => {
    window.nthTermDesktop = { ...(window.nthTermDesktop || {}), platform: 'win32' };
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    const toolbar = fixture.debugElement.query(By.css('.shell-toolbar')).nativeElement as HTMLElement;
    expect(toolbar.classList.contains('windows-titlebar')).toBeTrue();
    expect(toolbar.classList.contains('mac-titlebar')).toBeFalse();
    expect(fixture.debugElement.query(By.css('.traffic-lights'))).toBeNull();
  });

  it('reserves macOS traffic-light space without decorative lights', () => {
    window.nthTermDesktop = { ...(window.nthTermDesktop || {}), platform: 'darwin' };
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    fixture.detectChanges();

    const toolbar = fixture.debugElement.query(By.css('.shell-toolbar')).nativeElement as HTMLElement;
    expect(toolbar.classList.contains('mac-titlebar')).toBeTrue();
    expect(toolbar.classList.contains('windows-titlebar')).toBeFalse();
    expect(fixture.debugElement.query(By.css('.traffic-lights'))).toBeNull();
  });
});
