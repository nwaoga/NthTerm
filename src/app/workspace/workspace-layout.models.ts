export type WorkspaceViewMode = 'focus' | 'overview';

export interface WorkspaceLayoutState {
  workspaceId: string;
  activeTerminalId: string;
  viewMode: WorkspaceViewMode;
  /** 0 = fully focused, 1 = fully overview. Intermediate values reserved for continuous zoom. */
  zoomLevel: number;
}

export const FOCUS_ZOOM_THRESHOLD = 0.5;

/** Overview grid column count — keep in sync with terminal-overview layout. */
export function getOverviewColumnCount(terminalCount: number): number {
  if (terminalCount <= 1) {
    return 1;
  }
  if (terminalCount <= 4) {
    return 2;
  }
  if (terminalCount <= 6) {
    return 3;
  }
  return 5;
}
