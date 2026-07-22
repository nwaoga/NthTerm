export type WorkspaceViewMode = 'focus' | 'overview';

export interface WorkspaceLayoutState {
  workspaceId: string;
  activeTerminalId: string;
  viewMode: WorkspaceViewMode;
  /** 0 = fully focused, 1 = fully overview. Intermediate values reserved for continuous zoom. */
  zoomLevel: number;
}

export const FOCUS_ZOOM_THRESHOLD = 0.5;
