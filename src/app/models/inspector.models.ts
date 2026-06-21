import { TerminalInfo } from '../terminal-bridge.service';

export interface InspectorItem {
  label: string;
  value: string;
}

export interface InspectorSummaryItem {
  label: string;
  value: string;
}

export interface RuntimeSessionInfo extends TerminalInfo {}
