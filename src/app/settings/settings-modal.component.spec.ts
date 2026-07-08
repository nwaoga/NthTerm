import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { SettingsModalComponent } from './settings-modal.component';

describe('SettingsModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsModalComponent],
    }).compileComponents();
  });

  it('does not render when closed', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.componentInstance.open = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.settings-modal')).toBeNull();
  });

  it('renders grouped settings sections when open', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();

    const titles = fixture.debugElement
      .queryAll(By.css('.preference-section-title'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(titles).toEqual(['Workspace appearance', 'Terminal appearance', 'New workspaces']);
  });

  it('emits preference changes and closes from the header button', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    const component = fixture.componentInstance;
    const themeSpy = jasmine.createSpy('systemThemeChange');
    const paletteSpy = jasmine.createSpy('terminalAnsiPaletteChange');
    const closedSpy = jasmine.createSpy('closed');

    component.open = true;
    component.systemThemeChange.subscribe(themeSpy);
    component.terminalAnsiPaletteChange.subscribe(paletteSpy);
    component.closed.subscribe(closedSpy);
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('.preference-select'));
    selects[0].nativeElement.value = 'white';
    selects[0].nativeElement.dispatchEvent(new Event('change'));
    selects[2].nativeElement.value = 'dracula';
    selects[2].nativeElement.dispatchEvent(new Event('change'));

    fixture.debugElement.query(By.css('.settings-modal-close')).nativeElement.click();

    expect(themeSpy).toHaveBeenCalledWith('white');
    expect(paletteSpy).toHaveBeenCalledWith('dracula');
    expect(closedSpy).toHaveBeenCalled();
  });

  it('emits utility panel preference changes', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    const component = fixture.componentInstance;
    const panelSpy = jasmine.createSpy('utilityPanelPreferenceChange');

    component.open = true;
    component.utilityPanelVisible = true;
    component.utilityPanelPreferenceChange.subscribe(panelSpy);
    fixture.detectChanges();

    const checkbox = fixture.debugElement.query(By.css('.preference-toggle input'));
    checkbox.nativeElement.checked = false;
    checkbox.nativeElement.dispatchEvent(new Event('change'));

    expect(panelSpy).toHaveBeenCalledWith(false);
  });
});
