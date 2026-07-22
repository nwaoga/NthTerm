export type PaletteEntryKind =
  | 'action'
  | 'workspace'
  | 'command'
  | 'output'
  | 'problem'
  | 'pane';

export interface PaletteEntry {
  id: string;
  kind: PaletteEntryKind;
  group: string;
  label: string;
  detail: string;
  shortcut?: string;
}

export interface SearchResultGroup {
  label: string;
  items: { id: string; title: string; detail: string; kind?: PaletteEntryKind }[];
}

export interface PaletteActionDispatcher {
  saveWorkspace(): Promise<void>;
  restoreWorkspace(): Promise<void>;
  createTerminal(): Promise<void>;
  relaunchTerminal(): Promise<void>;
  interruptTerminal(): Promise<void>;
  killTerminal(): Promise<void>;
  openUtilityPanel(tab: import('./utility.models').UtilityPanelId): void;
  setInspectorTab(tab: import('./inspector.models').InspectorMode): void;
  setInspectorVisible(visible: boolean): void;
  openCommandPalette(): void;
  openGlobalSearch(): void;
  selectWorkspace(workspaceId: string): Promise<void>;
  createWorkspace(): Promise<void>;
  rerunCommand(command: string): Promise<void>;
  focusPane(paneId: string): Promise<void>;
  appendOutput(message: string, level?: import('./utility.models').OutputLine['level']): void;
}
