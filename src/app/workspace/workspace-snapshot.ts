import { LayoutMode, PaneSessionSnapshot, RuntimeTerminal, TerminalColorTheme } from '../models';
import { SavedWorkspace } from '../workspace-bridge.service';

export const MAX_TERMINALS_PER_WORKSPACE = 10;

/** @deprecated Prefer MAX_TERMINALS_PER_WORKSPACE */
export const MAX_TERMINALS_PER_TAB = MAX_TERMINALS_PER_WORKSPACE;

export interface SavedTerminalSnapshot {
  id: string;
  name?: string;
  cwd: string;
  shell?: string;
  startupCommand?: string;
  status: string;
  session?: PaneSessionSnapshot | null;
  theme?: TerminalColorTheme | null;
}

/** Legacy tab shape retained only for migrate-on-read. */
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
    focusedTerminalId: string;
    mode: LayoutMode;
    colSplit: number;
    rowSplit: number;
  };
  terminals: SavedTerminalSnapshot[];
  history?: SavedWorkspace['sessionSnapshot']['history'];
  recovery?: SavedWorkspace['sessionSnapshot']['recovery'];
}

export function normalizeWorkspaceSnapshot(
  snapshot: SavedWorkspace['sessionSnapshot'] | undefined,
  workspaceCwd: string
): NormalizedWorkspaceSnapshot {
  const history = snapshot?.history;
  const recovery = snapshot?.recovery;

  const empty: NormalizedWorkspaceSnapshot = {
    layout: {
      focusedTerminalId: '',
      mode: 'grid-2',
      colSplit: 50,
      rowSplit: 50,
    },
    terminals: [],
    history,
    recovery,
  };

  if (!snapshot) {
    return empty;
  }

  // Flat snapshot (post-tabs): terminals at workspace root.
  if (Array.isArray(snapshot.terminals)) {
    const terminals = snapshot.terminals.slice(0, MAX_TERMINALS_PER_WORKSPACE).map((terminal) => ({
      ...terminal,
      cwd: terminal.cwd || workspaceCwd,
      shell: terminal.shell || '',
      startupCommand: terminal.startupCommand || '',
      status: terminal.status || 'idle',
      session: terminal.session ?? null,
      theme: terminal.theme ?? null,
    }));
    const focusedTerminalId =
      snapshot.layout?.focusedTerminalId ||
      terminals.find((terminal) => terminal.id === snapshot.layout?.focusedPaneId)?.id ||
      terminals[0]?.id ||
      '';

    return {
      layout: {
        focusedTerminalId,
        mode: getEffectiveLayoutMode(terminals.length),
        colSplit: snapshot.layout?.colSplit ?? 50,
        rowSplit: snapshot.layout?.rowSplit ?? 50,
      },
      terminals,
      history,
      recovery,
    };
  }

  const rawTabs = snapshot.tabs || [];
  if (!rawTabs.length) {
    return empty;
  }

  const activeTabId = snapshot.layout?.activeTabId || rawTabs[0]?.id || '';
  let activeTab = rawTabs.find((tab) => tab.id === activeTabId) || rawTabs[0];

  const alreadyMigrated = rawTabs.some((tab) => Array.isArray(tab.terminals));
  if (!alreadyMigrated) {
    const panes = snapshot.layout?.panes || [];
    const focusedPaneId = snapshot.layout?.focusedPaneId || '';
    const migratedTabs = rawTabs.map((tab) => {
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
        assignedPanes
          .find((pane) => pane.id === focusedPaneId)
          ?.id.replace('pane-', 'terminal-') ||
        terminals[0]?.id ||
        '';

      return {
        ...tab,
        layoutMode: (snapshot.layout?.mode as LayoutMode) || 'grid-2x2',
        colSplit: snapshot.layout?.colSplit ?? 50,
        rowSplit: snapshot.layout?.rowSplit ?? 50,
        focusedTerminalId,
        terminals,
      };
    });

    activeTab = migratedTabs.find((tab) => tab.id === activeTabId) || migratedTabs[0];
    const focusedPaneTabId = panes.find((pane) => pane.id === focusedPaneId)?.tabId;
    let focusedTerminalId = activeTab?.focusedTerminalId || activeTab?.terminals?.[0]?.id || '';
    if (focusedPaneTabId === activeTab?.id && focusedPaneId) {
      focusedTerminalId = focusedPaneId.replace('pane-', 'terminal-');
    }

    const terminals = (activeTab?.terminals || []).slice(0, MAX_TERMINALS_PER_WORKSPACE);
    return {
      layout: {
        focusedTerminalId: terminals.some((t) => t.id === focusedTerminalId)
          ? focusedTerminalId
          : terminals[0]?.id || '',
        mode: getEffectiveLayoutMode(terminals.length),
        colSplit: activeTab?.colSplit ?? snapshot.layout?.colSplit ?? 50,
        rowSplit: activeTab?.rowSplit ?? snapshot.layout?.rowSplit ?? 50,
      },
      terminals,
      history,
      recovery,
    };
  }

  const terminals = (activeTab.terminals || []).slice(0, MAX_TERMINALS_PER_WORKSPACE).map((terminal) => ({
    ...terminal,
    cwd: terminal.cwd || activeTab.cwd || workspaceCwd,
    shell: terminal.shell || '',
    startupCommand: terminal.startupCommand || '',
    status: terminal.status || 'idle',
    session: terminal.session ?? null,
    theme: terminal.theme ?? null,
  }));

  const focusedTerminalId =
    snapshot.layout?.focusedTerminalId ||
    activeTab.focusedTerminalId ||
    terminals[0]?.id ||
    '';

  return {
    layout: {
      focusedTerminalId: terminals.some((t) => t.id === focusedTerminalId)
        ? focusedTerminalId
        : terminals[0]?.id || '',
      mode: getEffectiveLayoutMode(terminals.length),
      colSplit: activeTab.colSplit ?? snapshot.layout?.colSplit ?? 50,
      rowSplit: activeTab.rowSplit ?? snapshot.layout?.rowSplit ?? 50,
    },
    terminals,
    history,
    recovery,
  };
}

export function mapRuntimeTerminal(terminal: SavedTerminalSnapshot): RuntimeTerminal {
  return {
    id: terminal.id,
    name: terminal.name?.trim() || '',
    cwd: terminal.cwd,
    shell: terminal.shell || '',
    startupCommand: terminal.startupCommand || '',
    status: terminal.status || 'idle',
    session: terminal.session || null,
    theme: terminal.theme ?? null,
  };
}

export function createTerminalDraft(
  cwd: string,
  options?: { shell?: string; theme?: TerminalColorTheme | null; existingCount?: number }
): RuntimeTerminal {
  const nextIndex = (options?.existingCount ?? 0) + 1;
  return {
    id: `terminal-${nextIndex}-${Date.now()}`,
    name: '',
    cwd,
    shell: options?.shell ?? '',
    startupCommand: '',
    status: 'idle',
    session: null,
    theme: options?.theme ?? null,
  };
}

export function getEffectiveLayoutMode(terminalCount: number): LayoutMode {
  if (terminalCount <= 2) {
    return 'grid-2';
  }

  return 'grid-2x2';
}
