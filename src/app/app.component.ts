import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';

import { AppBridgeService } from './app-bridge.service';
import { BottomDockComponent } from './bottom-dock/bottom-dock.component';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { CommandPaletteService } from './command-palette/command-palette.service';
import { LeftRailComponent } from './left-rail/left-rail.component';
import { InspectorPresenterService } from './inspector/inspector-presenter.service';
import { LayoutMode, SessionListItem, TemplateListItem, UtilityPanelId, WORKSPACE_TEMPLATES } from './models';
import { AppPreferencesService } from './preferences/app-preferences.service';
import { ShellToolbarComponent } from './shell-toolbar/shell-toolbar.component';
import { StatusBarComponent } from './status-bar/status-bar.component';
import { SystemMonitorService } from './system/system-monitor.service';
import { TerminalHostCoordinatorService } from './terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from './terminal/terminal-session.service';
import { UtilityPanelService } from './utility-panel/utility-panel.service';
import { WorkspaceAreaComponent } from './workspace/workspace-area.component';
import { WorkspaceBridgeService } from './workspace-bridge.service';
import { WorkspaceRuntimeService } from './workspace/workspace-runtime.service';

@Component({
  selector: 'app-root',
  imports: [
    LeftRailComponent,
    ShellToolbarComponent,
    WorkspaceAreaComponent,
    BottomDockComponent,
    StatusBarComponent,
    CommandPaletteComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {
  @ViewChild(CommandPaletteComponent) private commandPalette?: CommandPaletteComponent;

  protected utilityPanelVisible = true;
  protected viewMenuOpen = false;
  protected preferencesOpen = false;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ws = inject(WorkspaceRuntimeService);
  private readonly util = inject(UtilityPanelService);
  private readonly palette = inject(CommandPaletteService);
  private readonly terminal = inject(TerminalSessionService);
  private readonly system = inject(SystemMonitorService);
  private readonly preferences = inject(AppPreferencesService);
  private readonly workspaceBridge = inject(WorkspaceBridgeService);
  private readonly appBridge = inject(AppBridgeService);
  private readonly hostCoordinator = inject(TerminalHostCoordinatorService);
  private readonly inspector = inject(InspectorPresenterService);
  private removeBeforeQuitListener?: () => void;
  private uptimeIntervalId?: number;

  constructor() {
    this.palette.setDispatcher({
      saveWorkspace: () => this.saveWorkspace(),
      restoreWorkspace: () => this.restoreWorkspace(),
      createTab: () => this.onCreateTab(),
      relaunchTerminal: () => this.terminal.relaunchTerminal(),
      interruptTerminal: () => this.terminal.interruptTerminal(),
      killTerminal: () => this.terminal.killTerminal(),
      openUtilityPanel: (tab) => this.openUtilityPanel(tab),
      setInspectorTab: (tab) => {
        this.inspector.activeTab = tab;
      },
      setLayoutMode: (mode) => this.onLayoutModeChange(mode),
      openCommandPalette: () => this.openCommandPalette(),
      selectWorkspace: (id) => this.onWorkspaceSelected(id),
      selectTab: async (id) => {
        const tab = await this.ws.selectTab(id);
        if (tab) await this.hostCoordinator.syncAndRestore();
      },
      createWorkspaceFromTemplate: async (templateId) => {
        const template = WORKSPACE_TEMPLATES.find((item) => item.templateId === templateId);
        if (template) await this.onTemplateSelected(template);
      },
      rerunCommand: (cmd) => this.terminal.rerunCommand(cmd),
      focusPane: async (id) => {
        const result = await this.ws.focusPane(id);
        if (result !== 'unchanged') await this.hostCoordinator.syncAndRestore();
      },
      appendOutput: (msg, level) => this.util.appendOutput(msg, level),
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.utilityPanelVisible = this.preferences.readBottomPanelVisible();
    if (!window.nthTermDesktop?.workspace) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.loadPreviewState();
      this.changeDetectorRef.detectChanges();
    } else {
      const workspaces = await this.workspaceBridge.listWorkspaces();
      const launchWorkspace = await this.workspaceBridge.getLaunchWorkspace();
      this.ws.sessions = workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        icon: w.icon || 'cloud',
        accent: w.accent || 'slate',
      }));
      this.ws.applyWorkspace(launchWorkspace);
      await this.hostCoordinator.syncAndRestore();
      this.registerShutdownPersistence();
      this.system.startMonitoring();
      this.util.appendOutput('Workspace shell initialized', 'info');
      this.util.appendOutput(`Restored last workspace "${launchWorkspace.name}"`, 'info');
      this.uptimeIntervalId = window.setInterval(() => this.changeDetectorRef.markForCheck(), 1000);
    }

    this.destroyRef.onDestroy(() => {
      this.removeBeforeQuitListener?.();
      this.terminal.dispose();
      this.system.stopMonitoring();
      if (this.uptimeIntervalId) window.clearInterval(this.uptimeIntervalId);
    });
  }

  protected togglePreferences(): void {
    this.preferencesOpen = !this.preferencesOpen;
  }

  protected setUtilityPanelPreference(visible: boolean): void {
    this.utilityPanelVisible = visible;
    this.preferences.writeBottomPanelVisible(visible);
    this.viewMenuOpen = false;
    setTimeout(() => this.terminal.syncTerminalSize(), 0);
  }

  protected openUtilityPanel(tab: UtilityPanelId): void {
    this.util.activeTab = tab;
    this.utilityPanelVisible = true;
    this.preferences.writeBottomPanelVisible(true);
    this.viewMenuOpen = false;
    setTimeout(() => this.terminal.syncTerminalSize(), 0);
  }

  protected openCommandPalette(focusSearch = false): void {
    this.commandPalette?.open(focusSearch);
  }

  protected openGlobalSearch(): void {
    this.openUtilityPanel('search');
    this.palette.query = this.util.searchQuery;
    this.openCommandPalette(true);
  }

  protected toggleViewMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.viewMenuOpen = !this.viewMenuOpen;
  }

  @HostListener('document:click')
  protected closeViewMenu(): void {
    this.viewMenuOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  protected handleGlobalKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const withCtrl = event.ctrlKey || event.metaKey;
    if (withCtrl && event.shiftKey && key === 'f') {
      event.preventDefault();
      this.openGlobalSearch();
    }
  }

  protected async onWorkspaceSelected(workspaceId: string): Promise<void> {
    const workspace = await this.ws.selectWorkspace(workspaceId);
    if (!workspace) return;
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Switched to workspace "${workspace.name}"`, 'info');
  }

  protected async onTemplateSelected(template: TemplateListItem): Promise<void> {
    const created = await this.ws.createWorkspaceFromTemplate(template);
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Created workspace "${created.name}" from template`, 'info');
  }

  protected async onSessionRenameCommitted(sessionId: string): Promise<void> {
    const result = await this.ws.commitRenameSession(sessionId);
    if (!result) return;
    if ('error' in result) {
      this.ws.status = result.error;
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    this.util.appendOutput(`Renamed workspace to "${result.name}"`, 'info');
  }

  protected async onSessionDeleteRequested(session: SessionListItem): Promise<void> {
    if (this.ws.sessions.length <= 1) {
      this.ws.status = 'At least one workspace must remain.';
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    if (!confirm(`Delete workspace "${session.name}"? This cannot be undone.`)) return;
    if (session.id === this.ws.selectedWorkspaceId) {
      await this.ws.persistWorkspaceState();
      this.terminal.dispose();
    }
    const result = await this.ws.deleteSession(session.id);
    if (!result) return;
    if ('error' in result) {
      this.ws.status = result.error;
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    if (result.activeWorkspace) await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Deleted workspace "${result.deletedName}"`, 'info');
  }

  protected async onCreateTab(): Promise<void> {
    const nextTab = this.ws.createTabDraft();
    if (!nextTab) return;
    this.ws.addTab(nextTab);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
  }

  protected async onLayoutModeChange(mode: LayoutMode): Promise<void> {
    const changed = await this.ws.setLayoutMode(mode);
    if (changed) await this.hostCoordinator.syncAndRestore();
  }

  protected onUtilityTabChange(_tab: UtilityPanelId): void {
    this.utilityPanelVisible = true;
    this.preferences.writeBottomPanelVisible(true);
    setTimeout(() => this.terminal.syncTerminalSize(), 0);
  }

  private async saveWorkspace(): Promise<void> {
    const saved = await this.ws.saveWorkspace();
    if (!saved) return;
    this.ws.status = `Saved workspace to ${saved.cwd}`;
    this.util.appendOutput(this.ws.status, 'info');
  }

  private async restoreWorkspace(): Promise<void> {
    const restored = await this.ws.restoreWorkspace();
    if (!restored) return;
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Restored workspace "${restored.name}"`, 'info');
  }

  private loadPreviewState(): void {
    this.ws.loadReferencePreviewState();
    this.util.commandHistory = [
      { id: 'cmd-1', command: 'dotnet run', timestamp: new Date().toISOString(), tabTitle: 'API' },
      { id: 'cmd-2', command: 'dotnet build', timestamp: new Date().toISOString(), tabTitle: 'API' },
      { id: 'cmd-3', command: 'dotnet restore', timestamp: new Date().toISOString(), tabTitle: 'API' },
      { id: 'cmd-4', command: 'code .', timestamp: new Date().toISOString(), tabTitle: 'Angular' },
      { id: 'cmd-5', command: 'git pull', timestamp: new Date().toISOString(), tabTitle: 'API' },
    ];
    this.util.outputLines = [
      { id: 'out-1', timestamp: new Date().toISOString(), level: 'info', message: 'OrderService - Processing order 12345' },
      { id: 'out-2', timestamp: new Date().toISOString(), level: 'info', message: 'PaymentService - Payment authorized' },
      { id: 'out-3', timestamp: new Date().toISOString(), level: 'info', message: 'InventoryService - Stock reserved' },
      { id: 'out-4', timestamp: new Date().toISOString(), level: 'info', message: 'OrderService - Order 12345 completed successfully' },
      { id: 'out-5', timestamp: new Date().toISOString(), level: 'info', message: 'NotificationService - Email sent to customer' },
      { id: 'out-6', timestamp: new Date().toISOString(), level: 'info', message: 'OrderService - Order 12346 created' },
    ];
    this.util.problems = [
      { id: 'problem-1', severity: 'error', message: 'Webpack warning in Angular build output', source: 'Angular', timestamp: new Date().toISOString() },
      { id: 'problem-2', severity: 'warning', message: 'Docker container restart detected', source: 'Docker', timestamp: new Date().toISOString() },
    ];
    this.system.systemMetrics = {
      cpuPercent: 23,
      memoryUsedGb: 6.2,
      memoryPercent: 39,
      diskPercent: 45,
      networkMbps: 12.4,
      collectedAt: new Date().toISOString(),
    };
    this.system.environmentVariables = [
      { name: 'ASPNETCORE_ENVIRONMENT', value: 'Development' },
      { name: 'DOTNET_ENVIRONMENT', value: 'Development' },
      { name: 'PATH', value: '...,\\bin' },
    ];
    this.terminal.sessionInfo = {
      id: 'preview-session-api',
      pid: 18452,
      cwd: 'C:\\Projects\\CloudPOS\\Api',
      shell: 'PowerShell 7.4.2',
      status: 'running',
      startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
      endedAt: null,
      exitCode: null,
      detectedPort: 7192,
    };
    this.util.activeTab = 'output';
  }

  private registerShutdownPersistence(): void {
    try {
      this.removeBeforeQuitListener = this.appBridge.onBeforeQuit(() => {
        void this.persistWorkspaceOnShutdown();
      });
    } catch {
      this.removeBeforeQuitListener = undefined;
    }
  }

  private async persistWorkspaceOnShutdown(): Promise<void> {
    if (!this.ws.selectedWorkspaceId) {
      void this.appBridge.quitReady();
      return;
    }
    try {
      await this.workspaceBridge.saveWorkspace(this.ws.currentWorkspaceDraft());
      await this.workspaceBridge.setActiveWorkspace(this.ws.selectedWorkspaceId);
    } finally {
      await this.appBridge.quitReady();
    }
  }
}
