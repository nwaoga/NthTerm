import type { Mock } from "vitest";
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppBridgeService } from './app-bridge.service';
import { AppPreferencesService } from './preferences/app-preferences.service';
import { SystemBridgeService } from './system-bridge.service';
import { TerminalBridgeService } from './terminal-bridge.service';
import { WorkspaceBridgeService } from './workspace-bridge.service';
import { resolveHostPlatform } from './platform/host-platform';

describe('AppComponent', () => {
    const originalInnerWidth = window.innerWidth;
    let workspaceBridge: {
        listWorkspaces: Mock;
        getLaunchWorkspace: Mock;
        getDirectoryDefaults: Mock;
        createWorkspace: Mock;
        saveWorkspace: Mock;
        setActiveWorkspace: Mock;
    };

    beforeEach(async () => {
        localStorage.clear();
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 1440,
        });
        workspaceBridge = {
            listWorkspaces: vi.fn().mockName('listWorkspaces').mockResolvedValue([
                {
                    id: 'workspace-1',
                    name: 'Default Workspace',
                    cwd: 'C:\\',
                    shell: '',
                    templateId: 'empty-workspace',
                    icon: 'cloud',
                    accent: 'violet',
                    layoutMode: 'grid-2x2',
                    launchProfile: 'manual',
                    sessionSnapshot: {
                        layout: {
                            mode: 'grid-2x2',
                            activeTabId: 'tab-1',
                            focusedPaneId: 'pane-1',
                            panes: [{ id: 'pane-1', tabId: 'tab-1' }],
                        },
                        tabs: [
                            {
                                id: 'tab-1',
                                title: 'Main',
                                cwd: 'C:\\',
                                status: 'running',
                                accent: 'violet',
                                shell: '',
                                startupCommand: '',
                            },
                        ],
                    },
                    updatedAt: '2026-06-17T00:00:00.000Z',
                },
            ]),
            getLaunchWorkspace: vi.fn().mockName('getLaunchWorkspace').mockResolvedValue({
                id: 'default',
                name: 'Default Workspace',
                cwd: 'C:\\',
                shell: '',
                templateId: 'empty-workspace',
                icon: 'cloud',
                accent: 'violet',
                layoutMode: 'grid-2x2',
                launchProfile: 'manual',
                sessionSnapshot: {
                    layout: {
                        mode: 'grid-2x2',
                        activeTabId: 'tab-1',
                        focusedPaneId: 'pane-1',
                        panes: [{ id: 'pane-1', tabId: 'tab-1' }],
                    },
                    tabs: [
                        {
                            id: 'tab-1',
                            title: 'Main',
                            cwd: 'C:\\',
                            status: 'running',
                            accent: 'violet',
                            shell: '',
                            startupCommand: '',
                        },
                    ],
                },
                updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            getDirectoryDefaults: vi.fn().mockName('getDirectoryDefaults').mockResolvedValue({ homeDirectory: 'C:\\Users\\blakb' }),
            createWorkspace: vi.fn().mockName('createWorkspace').mockImplementation(async (workspace: any) => ({
                id: 'workspace-2',
                shell: '',
                layoutMode: 'grid-2x2',
                launchProfile: 'manual',
                sessionSnapshot: {
                    layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] },
                    tabs: [],
                },
                updatedAt: '2026-06-17T00:00:00.000Z',
                ...workspace,
            })),
            saveWorkspace: vi.fn().mockName('saveWorkspace').mockResolvedValue({
                id: 'default',
                name: 'Default Workspace',
                cwd: 'C:\\',
                shell: '',
                templateId: 'empty-workspace',
                icon: 'cloud',
                accent: 'violet',
                layoutMode: 'grid-2x2',
                launchProfile: 'manual',
                sessionSnapshot: { layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] }, tabs: [] },
                updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            setActiveWorkspace: vi.fn().mockName('setActiveWorkspace').mockResolvedValue({
                id: 'default',
                name: 'Default Workspace',
                cwd: 'C:\\',
                shell: '',
                templateId: 'empty-workspace',
                icon: 'cloud',
                accent: 'violet',
                layoutMode: 'grid-2x2',
                launchProfile: 'manual',
                sessionSnapshot: { layout: { mode: 'grid-2x2', activeTabId: '', focusedPaneId: 'pane-1', panes: [] }, tabs: [] },
                updatedAt: '2026-06-17T00:00:00.000Z',
            }),
        };

        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                {
                    provide: TerminalBridgeService,
                    useValue: {
                        createSession: async () => 'terminal-1',
                        sendInput: async () => undefined,
                        resizeSession: async () => undefined,
                        disposeSession: async () => undefined,
                        interruptSession: async () => undefined,
                        getSessionInfo: async () => null,
                        listWslDistros: async () => ['Ubuntu'],
                        onData: () => () => undefined,
                        onExit: () => () => undefined,
                        onInfo: () => () => undefined,
                    },
                },
                {
                    provide: SystemBridgeService,
                    useValue: {
                        getMetrics: async () => null,
                        getSessionEnvironment: async () => [],
                    },
                },
                {
                    provide: AppBridgeService,
                    useValue: {
                        onBeforeQuit: () => () => undefined,
                        quitReady: async () => undefined,
                    },
                },
                {
                    provide: WorkspaceBridgeService,
                    useValue: workspaceBridge,
                },
            ],
        }).compileComponents();
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: originalInnerWidth,
        });
    });

    it('creates the app', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('exposes the host platform for platform-specific shell styling', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.getAttribute('data-host-platform')).toBe(resolveHostPlatform());
    });

    it('persists the resized dock height when dragging the resize handle', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'writeBottomPanelHeight');
        vi.spyOn(preferences, 'writeWorkspaceBottomPanelHeight');

        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: 900,
        });

        (fixture.componentInstance as any).setUtilityPanelPreference(true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        (fixture.componentInstance as any).startUtilityPanelResize(new MouseEvent('mousedown', { bubbles: true, clientY: 0 }));
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 500 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        fixture.detectChanges();

        const statusBar: HTMLElement | null = fixture.nativeElement.querySelector('.status-bar');
        const statusBarHeight = statusBar?.getBoundingClientRect().height ?? 36;
        const expectedHeight = 900 - 500 - statusBarHeight - 10;

        expect((fixture.componentInstance as any).utilityPanelHeight).toBe(expectedHeight);
        expect(preferences.writeBottomPanelHeight).toHaveBeenCalledWith(expectedHeight);
        expect(preferences.writeWorkspaceBottomPanelHeight).toHaveBeenCalledWith((fixture.componentInstance as any).ws.selectedWorkspaceId, expectedHeight);

        const workspaceShell: HTMLElement | null = fixture.nativeElement.querySelector('.workspace-shell');
        expect(workspaceShell?.style.getPropertyValue('--dock-height')).toBe(`${expectedHeight}px`);
    });

    it('starts with both rails and the dock collapsed when no visibility preference is stored', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const component = fixture.componentInstance as any;
        expect(component.leftRailVisible).toBe(false);
        expect(component.inspectorPanelVisible).toBe(false);
        expect(component.utilityPanelVisible).toBe(false);
        expect(fixture.nativeElement.querySelector('.app-shell.left-rail-hidden')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-left-rail')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspaces rail"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.content-layout.inspector-hidden')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Show inspector"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-bottom-dock')).toBeNull();
    });

    it('persists inspector panel visibility changes from the workspace area', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'writeInspectorPanelVisible');

        const component = fixture.componentInstance as any;
        component.setInspectorPanelPreference(true);
        fixture.detectChanges();
        expect(component.inspectorPanelVisible).toBe(true);
        expect(preferences.writeInspectorPanelVisible).toHaveBeenCalledWith(true);

        component.setInspectorPanelPreference(false);
        fixture.detectChanges();

        expect(component.inspectorPanelVisible).toBe(false);
        expect(preferences.writeInspectorPanelVisible).toHaveBeenCalledWith(false);
        expect(fixture.nativeElement.querySelector('.content-layout.inspector-hidden')).not.toBeNull();
    });

    it('persists left rail visibility changes and restores from the stage button', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'writeLeftRailVisible');

        const component = fixture.componentInstance as any;
        expect(component.leftRailVisible).toBe(false);
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspaces rail"]')).not.toBeNull();

        fixture.nativeElement.querySelector('[aria-label="Show workspaces rail"]').click();
        fixture.detectChanges();

        expect(component.leftRailVisible).toBe(true);
        expect(preferences.writeLeftRailVisible).toHaveBeenCalledWith(true);
        expect(fixture.nativeElement.querySelector('app-left-rail')).not.toBeNull();

        const hideButton = fixture.nativeElement.querySelector('[aria-label="Hide workspaces rail"]');
        expect(hideButton).not.toBeNull();
        hideButton.click();
        fixture.detectChanges();

        expect(component.leftRailVisible).toBe(false);
        expect(preferences.writeLeftRailVisible).toHaveBeenCalledWith(false);
        expect(fixture.nativeElement.querySelector('.app-shell.left-rail-hidden')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-left-rail')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspaces rail"]')).not.toBeNull();
    });

    it('collapses and restores the dock while persisting the active workspace preference', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'writeWorkspaceBottomPanelVisible');

        expect((fixture.componentInstance as any).utilityPanelVisible).toBe(false);
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]')).not.toBeNull();

        fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]').click();
        fixture.detectChanges();

        expect((fixture.componentInstance as any).utilityPanelVisible).toBe(true);
        expect(preferences.writeWorkspaceBottomPanelVisible).toHaveBeenCalledWith((fixture.componentInstance as any).ws.selectedWorkspaceId, true);

        fixture.nativeElement.querySelector('[aria-label="Hide workspace dock"]').click();
        fixture.detectChanges();

        expect((fixture.componentInstance as any).utilityPanelVisible).toBe(false);
        expect(fixture.nativeElement.querySelector('[aria-label="Show workspace dock"]')).not.toBeNull();
        expect(preferences.writeWorkspaceBottomPanelVisible).toHaveBeenCalledWith((fixture.componentInstance as any).ws.selectedWorkspaceId, false);
    });

    it('handles terminal, split, and dock keyboard workflows', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const component = fixture.componentInstance as any;
        const createTerminal = vi.spyOn(component, 'onCreateTerminal').mockResolvedValue(undefined);
        const cycleTerminal = vi.spyOn(component.ws, 'cycleTerminal').mockResolvedValue(null);
        const initialDockVisibility = component.utilityPanelVisible;

        component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 't', ctrlKey: true }));
        component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true }));
        component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true }));
        component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, altKey: true }));
        component.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true }));
        await fixture.whenStable();

        expect(createTerminal).toHaveBeenCalledWith(undefined);
        expect(createTerminal).toHaveBeenCalledTimes(2);
        expect(cycleTerminal).toHaveBeenCalledWith(1);
        expect(cycleTerminal).toHaveBeenCalledTimes(2);
        expect(component.utilityPanelVisible).toBe(!initialDockVisibility);
    });

    it('auto-collapses the inspector in compact windows without overwriting its preference', async () => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 1024,
        });
        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'readInspectorPanelVisible').mockReturnValue(true);
        vi.spyOn(preferences, 'writeInspectorPanelVisible');

        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const component = fixture.componentInstance as any;
        expect(component.inspectorPanelVisible).toBe(false);

        component.setInspectorPanelPreference(true);
        expect(component.inspectorPanelVisible).toBe(true);
        expect(preferences.writeInspectorPanelVisible).not.toHaveBeenCalled();

        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 1440,
        });
        window.dispatchEvent(new Event('resize'));

        expect(component.inspectorPanelVisible).toBe(true);
    });

    it('creates new workspaces from the configured custom directory', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const component = fixture.componentInstance as any;
        component.newSessionStartMode = 'custom';
        component.newSessionCustomPath = 'D:\\Workspaces\\NthTerm';

        await component.onNewSessionRequested();

        expect(workspaceBridge.createWorkspace).toHaveBeenCalledWith(expect.objectContaining({
            cwd: 'D:\\Workspaces\\NthTerm',
            name: 'New Workspace',
            templateId: '',
        }));
    });

    it('uses the workspace shell profile when creating a terminal from the toolbar default action', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const component = fixture.componentInstance as any;
        const preferences = TestBed.inject(AppPreferencesService);
        vi.spyOn(preferences, 'readDefaultShell').mockReturnValue('powershell');
        vi.spyOn(component.ws, 'resolveNewTerminalShell').mockReturnValue('cmd');
        vi.spyOn(component.ws, 'createTerminalDraft').mockReturnValue({
            id: 'terminal-created',
            cwd: 'C:\\',
            shell: 'cmd',
            startupCommand: '',
            status: 'idle',
            session: null,
        });
        vi.spyOn(component.ws, 'addTerminal');

        await component.onCreateTerminal(undefined);

        expect(component.ws.resolveNewTerminalShell).toHaveBeenCalledWith(undefined, 'powershell');
        expect(component.ws.createTerminalDraft).toHaveBeenCalledWith('cmd');
        expect(component.ws.addTerminal).toHaveBeenCalled();
    });

    it('creates a terminal from the toolbar default action', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        const component = fixture.componentInstance as any;
        const preferences = TestBed.inject(AppPreferencesService);
        const terminal = {
            id: 'terminal-created',
            cwd: 'C:\\',
            shell: 'powershell',
            startupCommand: '',
            status: 'idle',
            session: null,
        };
        vi.spyOn(preferences, 'readDefaultShell').mockReturnValue('powershell');
        vi.spyOn(component.ws, 'resolveNewTerminalShell').mockReturnValue('powershell');
        vi.spyOn(component.ws, 'createTerminalDraft').mockReturnValue(terminal);
        vi.spyOn(component.ws, 'addTerminal').mockReturnValue(undefined);
        vi.spyOn(component.terminal, 'focusTerminal').mockReturnValue(undefined);

        await component.onCreateTerminal(undefined);

        expect(component.ws.resolveNewTerminalShell).toHaveBeenCalledWith(undefined, 'powershell');
        expect(component.ws.createTerminalDraft).toHaveBeenCalledWith('powershell');
        expect(component.ws.addTerminal).toHaveBeenCalledWith(terminal);
        expect(component.terminal.focusTerminal).toHaveBeenCalledWith('terminal-created');
    });
});
