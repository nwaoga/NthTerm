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
  const count = Math.max(0, terminalCount);
  if (count <= 1) {
    return 1;
  }
  return Math.ceil(Math.sqrt(count));
}

/** Overview grid row count for an equal-cell fill layout. */
export function getOverviewRowCount(terminalCount: number): number {
  const count = Math.max(0, terminalCount);
  if (count <= 1) {
    return 1;
  }
  return Math.ceil(count / getOverviewColumnCount(count));
}
