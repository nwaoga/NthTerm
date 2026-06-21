export type PaletteEntryKind =
  | 'action'
  | 'workspace'
  | 'tab'
  | 'template'
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
  createTab(): Promise<void>;
  relaunchTerminal(): Promise<void>;
  interruptTerminal(): Promise<void>;
  killTerminal(): Promise<void>;
  openUtilityPanel(tab: import('./utility.models').UtilityPanelId): void;
  setInspectorTab(tab: 'tab' | 'session'): void;
  setLayoutMode(mode: import('./workspace.models').LayoutMode): Promise<void>;
  openCommandPalette(): void;
  selectWorkspace(workspaceId: string): Promise<void>;
  selectTab(tabId: string): Promise<void>;
  createWorkspaceFromTemplate(templateId: string): Promise<void>;
  rerunCommand(command: string): Promise<void>;
  focusPane(paneId: string): Promise<void>;
  appendOutput(message: string, level?: import('./utility.models').OutputLine['level']): void;
}
