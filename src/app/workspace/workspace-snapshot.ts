import { LayoutMode, PaneSessionSnapshot, RuntimeTab, RuntimeTerminal, TerminalColorTheme } from '../models';
import { SavedWorkspace } from '../workspace-bridge.service';

export const MAX_TABS_PER_WORKSPACE = 5;
export const MAX_TERMINALS_PER_TAB = 4;

export interface SavedTerminalSnapshot {
  id: string;
  cwd: string;
  shell?: string;
  startupCommand?: string;
  status: string;
  session?: PaneSessionSnapshot | null;
  theme?: TerminalColorTheme | null;
}

export interface SavedTabSnapshot {
  id: string;
  title: string;
  cwd: string;
  accent: string;
  shell?: string;
  startupCommand?: string;
  status?: string;
  layoutMode?: LayoutMode;
  colSplit?: number;
  rowSplit?: number;
  focusedTerminalId?: string;
  terminals?: SavedTerminalSnapshot[];
}

export interface NormalizedWorkspaceSnapshot {
  layout: {
    activeTabId: string;
    focusedTerminalId?: string;
    mode?: LayoutMode;
    focusedPaneId?: string;
    colSplit?: number;
    rowSplit?: number;
    panes?: Array<{
      id: string;
      tabId: string | null;
      session?: PaneSessionSnapshot | null;
    }>;
  };
  tabs: SavedTabSnapshot[];
  history?: SavedWorkspace['sessionSnapshot']['history'];
  recovery?: SavedWorkspace['sessionSnapshot']['recovery'];
}

export function normalizeWorkspaceSnapshot(
  snapshot: SavedWorkspace['sessionSnapshot'] | undefined,
  workspaceCwd: string
): NormalizedWorkspaceSnapshot {
  const base: NormalizedWorkspaceSnapshot = {
    layout: {
      activeTabId: snapshot?.layout?.activeTabId || '',
      focusedTerminalId: '',
      mode: (snapshot?.layout?.mode as LayoutMode) || 'grid-2x2',
      colSplit: snapshot?.layout?.colSplit ?? 50,
      rowSplit: snapshot?.layout?.rowSplit ?? 50,
    },
    tabs: [],
    history: snapshot?.history,
    recovery: snapshot?.recovery,
  };

  const rawTabs = snapshot?.tabs || [];
  if (!rawTabs.length) {
    base.tabs = [createEmptyTabSnapshot('Main', workspaceCwd)];
    base.layout.activeTabId = base.tabs[0].id;
    return base;
  }

  const alreadyMigrated = rawTabs.some((tab) => Array.isArray(tab.terminals));
  if (alreadyMigrated) {
    base.tabs = rawTabs.map((tab) => ({
      ...tab,
      terminals: tab.terminals || [],
      layoutMode: (tab.layoutMode as LayoutMode) || (snapshot?.layout?.mode as LayoutMode) || 'grid-2x2',
      colSplit: tab.colSplit ?? snapshot?.layout?.colSplit ?? 50,
      rowSplit: tab.rowSplit ?? snapshot?.layout?.rowSplit ?? 50,
      focusedTerminalId: tab.focusedTerminalId || tab.terminals?.[0]?.id || '',
    }));
    base.layout.activeTabId =
      snapshot?.layout?.activeTabId || base.tabs[0]?.id || '';
    const activeTab = base.tabs.find((tab) => tab.id === base.layout.activeTabId);
    base.layout.focusedTerminalId =
      activeTab?.focusedTerminalId || activeTab?.terminals?.[0]?.id || '';
    return base;
  }

  const panes = snapshot?.layout?.panes || [];
  const focusedPaneId = snapshot?.layout?.focusedPaneId || '';
  base.tabs = rawTabs.map((tab) => {
    const assignedPanes = panes.filter((pane) => pane.tabId === tab.id);
    const terminals: SavedTerminalSnapshot[] = assignedPanes.map((pane) => ({
      id: pane.id.startsWith('pane-') ? pane.id.replace('pane-', 'terminal-') : pane.id,
      cwd: tab.cwd || workspaceCwd,
      shell: tab.shell || '',
      startupCommand: tab.startupCommand || '',
      status: tab.status || 'idle',
      session: pane.session || null,
    }));

    const focusedTerminalId =
      assignedPanes.find((pane) => pane.id === focusedPaneId)?.id.replace('pane-', 'terminal-') ||
      terminals[0]?.id ||
      '';

    return {
      id: tab.id,
      title: tab.title,
      cwd: tab.cwd || workspaceCwd,
      accent: tab.accent,
      shell: tab.shell,
      startupCommand: tab.startupCommand,
      status: tab.status,
      layoutMode: (snapshot?.layout?.mode as LayoutMode) || 'grid-2x2',
      colSplit: snapshot?.layout?.colSplit ?? 50,
      rowSplit: snapshot?.layout?.rowSplit ?? 50,
      focusedTerminalId,
      terminals,
    };
  });

  base.layout.activeTabId =
    snapshot?.layout?.activeTabId || base.tabs[0]?.id || '';
  const activeTab = base.tabs.find((tab) => tab.id === base.layout.activeTabId);
  const focusedPaneTabId = panes.find((pane) => pane.id === focusedPaneId)?.tabId;
  if (focusedPaneTabId && focusedPaneId) {
    const terminalId = focusedPaneId.replace('pane-', 'terminal-');
    base.layout.focusedTerminalId = terminalId;
  } else {
    base.layout.focusedTerminalId =
      activeTab?.focusedTerminalId || activeTab?.terminals?.[0]?.id || '';
  }

  return base;
}

export function mapRuntimeTab(tab: SavedTabSnapshot): RuntimeTab {
  return {
    id: tab.id,
    title: tab.title,
    cwd: tab.cwd,
    accent: tab.accent,
    layoutMode: tab.layoutMode || 'grid-2x2',
    colSplit: tab.colSplit ?? 50,
    rowSplit: tab.rowSplit ?? 50,
    focusedTerminalId: tab.focusedTerminalId || tab.terminals?.[0]?.id || '',
    terminals: (tab.terminals || []).map(mapRuntimeTerminal),
  };
}

export function mapRuntimeTerminal(terminal: SavedTerminalSnapshot): RuntimeTerminal {
  return {
    id: terminal.id,
    cwd: terminal.cwd,
    shell: terminal.shell || '',
    startupCommand: terminal.startupCommand || '',
    status: terminal.status || 'idle',
    session: terminal.session || null,
    theme: terminal.theme ?? null,
  };
}

export function createEmptyTabSnapshot(title: string, cwd: string, accent = 'violet'): SavedTabSnapshot {
  return {
    id: `tab-${Date.now()}`,
    title,
    cwd,
    accent,
    layoutMode: 'grid-2x2',
    colSplit: 50,
    rowSplit: 50,
    focusedTerminalId: '',
    terminals: [],
  };
}

export function createTerminalDraft(
  tab: RuntimeTab,
  workspaceCwd: string,
  options?: { shell?: string; theme?: TerminalColorTheme | null }
): RuntimeTerminal {
  const nextIndex = tab.terminals.length + 1;
  return {
    id: `terminal-${nextIndex}-${Date.now()}`,
    cwd: tab.cwd || workspaceCwd,
    shell: options?.shell ?? '',
    startupCommand: '',
    status: 'idle',
    session: null,
    theme: options?.theme ?? null,
  };
}

export function getEffectiveLayoutMode(tab: RuntimeTab): LayoutMode {
  if (tab.terminals.length <= 2) {
    return 'grid-2';
  }

  return tab.layoutMode || 'grid-2x2';
}
