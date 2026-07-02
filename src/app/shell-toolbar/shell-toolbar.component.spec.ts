import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommandPaletteService } from '../command-palette/command-palette.service';
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
          },
        },
        {
          provide: CommandPaletteService,
          useValue: {},
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

    fixture.debugElement.query(By.css('.toolbar-pill-primary')).nativeElement.click();
    fixture.debugElement.queryAll(By.css('.toolbar-pill-segment'))[0].nativeElement.click();

    expect(createSpy).toHaveBeenCalled();
    expect(layoutSpy).toHaveBeenCalledWith('grid-2');
  });

  it('emits search, command palette, utility panel, and menu toggle actions', () => {
    const fixture = TestBed.createComponent(ShellToolbarComponent);
    const component = fixture.componentInstance;
    const searchSpy = jasmine.createSpy('globalSearchRequested');
    const paletteSpy = jasmine.createSpy('commandPaletteRequested');
    const utilitySpy = jasmine.createSpy('utilityPanelOpen');
    const toggleSpy = jasmine.createSpy('viewMenuToggle');

    component.globalSearchRequested.subscribe(searchSpy);
    component.commandPaletteRequested.subscribe(paletteSpy);
    component.utilityPanelOpen.subscribe(utilitySpy);
    component.viewMenuToggle.subscribe(toggleSpy);

    component.viewMenuOpen = true;
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.toolbar-search')).nativeElement.click();
    fixture.debugElement.query(By.css('.toolbar-command')).nativeElement.click();
    fixture.debugElement.query(By.css('.toolbar-settings-button')).nativeElement.click();
    fixture.detectChanges();

    const menuItems = fixture.debugElement.queryAll(By.css('.view-menu-item'));
    menuItems[0].nativeElement.click();

    expect(searchSpy).toHaveBeenCalled();
    expect(paletteSpy).toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalled();
    expect(utilitySpy).toHaveBeenCalledWith('output');
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

    expect(summary).toContain('2 tabs');
    expect(summary).toContain('API');
    expect(layout).toContain('2x2');
    expect(contextLabel).toContain('Active Workspace');
    expect(contextBadge).toContain('Sidebar');
  });
});
