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

    workspace.workspaces = [{ id: 'ws-1', name: 'Cloud POS', icon: 'cloud', accent: 'violet' }];
    workspace.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'API',
        cwd: 'C:\\Projects\\Api',
        accent: 'violet',
        layoutMode: 'grid-2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Projects\\Api',
            shell: '',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
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
    expect(entries.some((entry) => entry.id === 'save-workspace')).toBeTrue();
    expect(entries.every((entry) => entry.label.toLowerCase().includes('save') || entry.detail.toLowerCase().includes('save') || entry.group.toLowerCase().includes('save'))).toBeTrue();
  });

  it('builds search result groups for workspaces and commands', () => {
    utility.searchQuery = 'cloud';
    const groups = service.getSearchResultGroups();
    expect(groups.some((group) => group.label === 'Workspaces')).toBeTrue();

    utility.searchQuery = 'dotnet';
    const commandGroups = service.getSearchResultGroups();
    expect(commandGroups.some((group) => group.label === 'Commands')).toBeTrue();
  });

  it('dispatches palette actions through the dispatcher', async () => {
    const save = jasmine.createSpy('saveWorkspace').and.resolveTo();
    const dispatcher: PaletteActionDispatcher = {
      saveWorkspace: save,
      restoreWorkspace: async () => undefined,
      createTab: async () => undefined,
      relaunchTerminal: async () => undefined,
      interruptTerminal: async () => undefined,
      killTerminal: async () => undefined,
      openUtilityPanel: () => undefined,
      setInspectorTab: () => undefined,
      setLayoutMode: async () => undefined,
      openCommandPalette: () => undefined,
      selectWorkspace: async () => undefined,
      selectTab: async () => undefined,
      createWorkspaceFromTemplate: async () => undefined,
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
});
