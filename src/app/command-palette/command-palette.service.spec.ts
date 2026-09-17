import { TestBed } from '@angular/core/testing';

import { CommandPaletteService } from './command-palette.service';
import { PaletteActionDispatcher } from '../models';
import { SystemMonitorService } from '../system/system-monitor.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

describe('CommandPaletteService', () => {
    let service: CommandPaletteService;
    let workspace: WorkspaceRuntimeService;
    let utility: UtilityPanelService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CommandPaletteService);
        workspace = TestBed.inject(WorkspaceRuntimeService);
        utility = TestBed.inject(UtilityPanelService);

        workspace.workspaces = [{ id: 'ws-1', name: 'Studio Stack', icon: 'cloud', accent: 'violet' }];
        workspace.terminals = [
            {
                id: 'terminal-1',
                name: 'API',
                cwd: 'C:\\Projects\\Api',
                shell: '',
                startupCommand: '',
                status: 'running',
                session: null,
            },
        ];
        utility.commandHistory = [
            {
                id: 'cmd-1',
                command: 'dotnet run',
                timestamp: new Date().toISOString(),
                tabTitle: 'API',
            },
        ];
    });

    it('filters palette entries by query', () => {
        service.query = 'save';
        const entries = service.getFilteredEntries();
        expect(entries.some((entry) => entry.id === 'save-workspace')).toBe(true);
        expect(entries.every((entry) => entry.label.toLowerCase().includes('save') || entry.detail.toLowerCase().includes('save') || entry.group.toLowerCase().includes('save'))).toBe(true);
    });

    it('builds search result groups for workspaces, terminals, and commands', () => {
        utility.searchQuery = 'studio';
        const groups = service.getSearchResultGroups();
        expect(groups.some((group) => group.label === 'Workspaces')).toBe(true);

        utility.searchQuery = 'api';
        const terminalGroups = service.getSearchResultGroups();
        expect(terminalGroups.some((group) => group.label === 'Terminals')).toBe(true);

        utility.searchQuery = 'dotnet';
        const commandGroups = service.getSearchResultGroups();
        expect(commandGroups.some((group) => group.label === 'Commands')).toBe(true);
    });

    it('dispatches palette actions through the dispatcher', async () => {
        const save = vi.fn().mockName('saveWorkspace').mockResolvedValue(undefined);
        const dispatcher: PaletteActionDispatcher = {
            saveWorkspace: save,
            restoreWorkspace: async () => undefined,
            createTerminal: async () => undefined,
            relaunchTerminal: async () => undefined,
            interruptTerminal: async () => undefined,
            killTerminal: async () => undefined,
            openUtilityPanel: () => undefined,
            setInspectorTab: () => undefined,
            setInspectorVisible: () => undefined,
            setLeftRailVisible: () => undefined,
            openCommandPalette: () => undefined,
            openGlobalSearch: () => undefined,
            selectWorkspace: async () => undefined,
            createWorkspace: async () => undefined,
            rerunCommand: async () => undefined,
            focusPane: async () => undefined,
            appendOutput: () => undefined,
        };

        service.setDispatcher(dispatcher);
        await service.executeEntry({
            id: 'save-workspace',
            kind: 'action',
            group: 'Workspace',
            label: 'Save Workspace',
            detail: '',
        });

        expect(save).toHaveBeenCalled();
    });

    it('routes the open-search action through openGlobalSearch', async () => {
        const openGlobalSearch = vi.fn().mockName('openGlobalSearch');
        const dispatcher: PaletteActionDispatcher = {
            saveWorkspace: async () => undefined,
            restoreWorkspace: async () => undefined,
            createTerminal: async () => undefined,
            relaunchTerminal: async () => undefined,
            interruptTerminal: async () => undefined,
            killTerminal: async () => undefined,
            openUtilityPanel: () => undefined,
            setInspectorTab: () => undefined,
            setInspectorVisible: () => undefined,
            setLeftRailVisible: () => undefined,
            openCommandPalette: () => undefined,
            openGlobalSearch,
            selectWorkspace: async () => undefined,
            createWorkspace: async () => undefined,
            rerunCommand: async () => undefined,
            focusPane: async () => undefined,
            appendOutput: () => undefined,
        };

        service.setDispatcher(dispatcher);
        await service.executeEntry({
            id: 'open-search',
            kind: 'action',
            group: 'View',
            label: 'Show Search Panel',
            detail: '',
        });

        expect(openGlobalSearch).toHaveBeenCalled();
    });

    it('dispatches inspector visibility actions', async () => {
        const setInspectorVisible = vi.fn().mockName('setInspectorVisible');
        const setInspectorTab = vi.fn().mockName('setInspectorTab');
        const dispatcher: PaletteActionDispatcher = {
            saveWorkspace: async () => undefined,
            restoreWorkspace: async () => undefined,
            createTerminal: async () => undefined,
            relaunchTerminal: async () => undefined,
            interruptTerminal: async () => undefined,
            killTerminal: async () => undefined,
            openUtilityPanel: () => undefined,
            setInspectorTab,
            setInspectorVisible,
            setLeftRailVisible: () => undefined,
            openCommandPalette: () => undefined,
            openGlobalSearch: () => undefined,
            selectWorkspace: async () => undefined,
            createWorkspace: async () => undefined,
            rerunCommand: async () => undefined,
            focusPane: async () => undefined,
            appendOutput: () => undefined,
        };

        service.setDispatcher(dispatcher);
        await service.executeEntry({
            id: 'hide-inspector',
            kind: 'action',
            group: 'View',
            label: 'Hide Inspector',
            detail: '',
        });
        await service.executeEntry({
            id: 'show-inspector',
            kind: 'action',
            group: 'View',
            label: 'Show Inspector',
            detail: '',
        });
        await service.executeEntry({
            id: 'inspector-workspace',
            kind: 'action',
            group: 'View',
            label: 'Show Workspace Inspector',
            detail: '',
        });
        await service.executeEntry({
            id: 'inspector-terminal',
            kind: 'action',
            group: 'View',
            label: 'Show Terminal Inspector',
            detail: '',
        });

        expect(setInspectorVisible).toHaveBeenCalledWith(false);
        expect(setInspectorVisible).toHaveBeenCalledWith(true);
        expect(setInspectorTab).toHaveBeenCalledWith('workspace');
        expect(setInspectorTab).toHaveBeenCalledWith('terminal');
    });

    it('dispatches left rail visibility actions', async () => {
        const setLeftRailVisible = vi.fn().mockName('setLeftRailVisible');
        const dispatcher: PaletteActionDispatcher = {
            saveWorkspace: async () => undefined,
            restoreWorkspace: async () => undefined,
            createTerminal: async () => undefined,
            relaunchTerminal: async () => undefined,
            interruptTerminal: async () => undefined,
            killTerminal: async () => undefined,
            openUtilityPanel: () => undefined,
            setInspectorTab: () => undefined,
            setInspectorVisible: () => undefined,
            setLeftRailVisible,
            openCommandPalette: () => undefined,
            openGlobalSearch: () => undefined,
            selectWorkspace: async () => undefined,
            createWorkspace: async () => undefined,
            rerunCommand: async () => undefined,
            focusPane: async () => undefined,
            appendOutput: () => undefined,
        };

        service.setDispatcher(dispatcher);
        await service.executeEntry({
            id: 'hide-left-rail',
            kind: 'action',
            group: 'View',
            label: 'Hide Workspaces Rail',
            detail: '',
        });
        await service.executeEntry({
            id: 'show-left-rail',
            kind: 'action',
            group: 'View',
            label: 'Show Workspaces Rail',
            detail: '',
        });

        expect(setLeftRailVisible).toHaveBeenCalledWith(false);
        expect(setLeftRailVisible).toHaveBeenCalledWith(true);
    });
});
