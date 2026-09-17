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

        expect(titles).toEqual([
            'Workspace appearance',
            'Terminal appearance',
            'New workspaces',
            'Updates',
        ]);
    });

    it('emits preference changes and closes from the header button', () => {
        const fixture = TestBed.createComponent(SettingsModalComponent);
        const component = fixture.componentInstance;
        const themeSpy = vi.fn().mockName('systemThemeChange');
        const paletteSpy = vi.fn().mockName('terminalAnsiPaletteChange');
        const closedSpy = vi.fn().mockName('closed');

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

    it('emits window transparency from the appearance slider', () => {
        const fixture = TestBed.createComponent(SettingsModalComponent);
        const component = fixture.componentInstance;
        const transparencySpy = vi.fn().mockName('windowTransparencyChange');

        component.open = true;
        component.windowTransparencyChange.subscribe(transparencySpy);
        fixture.detectChanges();

        const slider = fixture.debugElement.query(By.css('.preference-range'));
        slider.nativeElement.value = '40';
        slider.nativeElement.dispatchEvent(new Event('input'));
        slider.nativeElement.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(transparencySpy).toHaveBeenCalledWith(40);
    });

    it('emits utility panel preference changes', () => {
        const fixture = TestBed.createComponent(SettingsModalComponent);
        const component = fixture.componentInstance;
        const panelSpy = vi.fn().mockName('utilityPanelPreferenceChange');

        component.open = true;
        component.utilityPanelVisible = true;
        component.utilityPanelPreferenceChange.subscribe(panelSpy);
        fixture.detectChanges();

        const checkbox = fixture.debugElement.query(By.css('.preference-toggle input'));
        checkbox.nativeElement.checked = false;
        checkbox.nativeElement.dispatchEvent(new Event('change'));

        expect(panelSpy).toHaveBeenCalledWith(false);
    });

    it('emits update check and restart actions', () => {
        const fixture = TestBed.createComponent(SettingsModalComponent);
        const component = fixture.componentInstance;
        const checkSpy = vi.fn().mockName('checkForUpdatesRequested');
        const restartSpy = vi.fn().mockName('restartToUpdateRequested');

        component.open = true;
        component.appVersion = '0.1.0-rc.6';
        component.updateReady = true;
        component.checkForUpdatesRequested.subscribe(checkSpy);
        component.restartToUpdateRequested.subscribe(restartSpy);
        fixture.detectChanges();

        const buttons = fixture.debugElement.queryAll(By.css('.settings-update-button'));
        buttons[0].nativeElement.click();
        buttons[1].nativeElement.click();

        expect(checkSpy).toHaveBeenCalled();
        expect(restartSpy).toHaveBeenCalled();
    });
});
