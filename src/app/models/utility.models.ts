export type UtilityPanelId = 'output' | 'problems' | 'search' | 'command-history';

export interface UtilityTab {
  id: UtilityPanelId;
  label: string;
  count?: number;
}

export interface OutputLine {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ProblemEntry {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source: string;
  timestamp: string;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: string;
  tabTitle: string;
  tabId?: string;
  terminalId?: string;
  terminalTitle?: string;
}

export interface CommandHistorySource {
  tabId?: string;
  terminalId: string;
  tabTitle: string;
  terminalTitle: string;
}
