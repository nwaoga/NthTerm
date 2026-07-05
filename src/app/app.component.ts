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
import { LayoutMode, WorkspaceListItem, TemplateListItem, UtilityPanelId, WORKSPACE_TEMPLATES } from './models';
import {
  AppPreferencesService,
  DefaultShellPreference,
  NewSessionStartMode,
} from './preferences/app-preferences.service';
import { ReferenceReviewContentService } from './reference/reference-review-content.service';
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
  protected utilityPanelHeight = 280;
  protected viewMenuOpen = false;
  protected preferencesOpen = false;
  protected dockResizeActive = false;
  protected newSessionStartMode: NewSessionStartMode = 'focused-tab';
  protected newSessionCustomPath = '';
  protected homeDirectory = '';
  protected defaultShell: DefaultShellPreference = '';

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ws = inject(WorkspaceRuntimeService);
  private readonly util = inject(UtilityPanelService);
  private readonly palette = inject(CommandPaletteService);
  private readonly terminal = inject(TerminalSessionService);
  private readonly system = inject(SystemMonitorService);
  private readonly referenceReview = inject(ReferenceReviewContentService);
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
    this.utilityPanelHeight = this.preferences.readBottomPanelHeight();
    this.newSessionStartMode = this.preferences.readNewSessionStartMode();
    this.newSessionCustomPath = this.preferences.readNewSessionCustomPath();
    this.defaultShell = this.preferences.readDefaultShell();
    if (!window.nthTermDesktop?.workspace) {
      this.loadPreviewState();
      this.changeDetectorRef.detectChanges();
    } else {
      const defaults = await this.workspaceBridge.getDirectoryDefaults();
      this.homeDirectory = defaults.homeDirectory;
      const workspaces = await this.workspaceBridge.listWorkspaces();
      const launchWorkspace = await this.workspaceBridge.getLaunchWorkspace();
      this.ws.workspaces = workspaces.map((w) => ({
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

  protected setNewSessionStartMode(mode: NewSessionStartMode): void {
    this.newSessionStartMode = mode;
    this.preferences.writeNewSessionStartMode(mode);
  }

  protected setNewSessionCustomPath(path: string): void {
    this.newSessionCustomPath = path;
    this.preferences.writeNewSessionCustomPath(path);
  }

  protected setDefaultShell(shell: DefaultShellPreference): void {
    this.defaultShell = shell;
    this.preferences.writeDefaultShell(shell);
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

  protected startUtilityPanelResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dockResizeActive = true;
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

  @HostListener('document:mousemove', ['$event'])
  protected handleDockResizeMouseMove(event: MouseEvent): void {
    if (!this.dockResizeActive) {
      return;
    }

    const viewportHeight = window.innerHeight;
    const nextHeight = viewportHeight - event.clientY - 32;
    this.utilityPanelHeight = this.preferences.clampBottomPanelHeight(nextHeight);
    this.terminal.syncTerminalSize();
  }

  @HostListener('document:mouseup')
  protected handleDockResizeMouseUp(): void {
    if (!this.dockResizeActive) {
      return;
    }

    this.dockResizeActive = false;
    this.preferences.writeBottomPanelHeight(this.utilityPanelHeight);
    this.terminal.syncTerminalSize();
  }

  protected async onWorkspaceSelected(workspaceId: string): Promise<void> {
    const workspace = await this.ws.selectWorkspace(workspaceId);
    if (!workspace) return;
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Switched to workspace "${workspace.name}"`, 'info');
  }

  protected async onTemplateSelected(template: TemplateListItem): Promise<void> {
    const created = await this.ws.createWorkspaceFromTemplate(template, {
      cwd:
        template.templateId === 'empty-workspace'
          ? this.resolveNewSessionDirectory(template.cwd)
          : template.cwd,
    });
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Created workspace "${created.name}" from template`, 'info');
  }

  protected async onNewSessionRequested(): Promise<void> {
    const template =
      WORKSPACE_TEMPLATES.find((item) => item.templateId === 'empty-workspace') ||
      WORKSPACE_TEMPLATES[0];
    const created = await this.ws.createWorkspaceFromTemplate(template, {
      cwd: this.resolveNewSessionDirectory(template.cwd),
      name: this.ws.buildWorkspaceName('New Workspace'),
    });
    await this.hostCoordinator.syncAndRestore();
    this.util.appendOutput(`Created new workspace "${created.name}"`, 'info');
  }

  protected async onWorkspaceRenameCommitted(workspaceId: string): Promise<void> {
    const result = await this.ws.commitRenameWorkspace(workspaceId);
    if (!result) return;
    if ('error' in result) {
      this.ws.status = result.error;
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    this.util.appendOutput(`Renamed workspace to "${result.name}"`, 'info');
  }

  protected async onWorkspaceDeleteRequested(workspace: WorkspaceListItem): Promise<void> {
    if (this.ws.workspaces.length <= 1) {
      this.ws.status = 'At least one workspace must remain.';
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    if (!confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;
    if (workspace.id === this.ws.selectedWorkspaceId) {
      await this.ws.persistWorkspaceState();
      this.terminal.dispose();
    }
    const result = await this.ws.deleteWorkspace(workspace.id);
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
    if (!nextTab || nextTab === 'blocked') {
      if (nextTab === 'blocked') {
        this.ws.status = 'A workspace can have at most 5 tabs.';
        this.util.appendOutput(this.ws.status, 'warn');
      }
      return;
    }
    this.ws.addTab(nextTab);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
  }

  protected async onCreateTerminal(shell: DefaultShellPreference = this.preferences.readDefaultShell()): Promise<void> {
    const draft = this.ws.createTerminalDraft(shell);
    if (!draft || draft === 'blocked') {
      if (draft === 'blocked') {
        this.ws.status = 'A tab can have at most 4 terminals.';
        this.util.appendOutput(this.ws.status, 'warn');
      }
      return;
    }
    this.ws.addTerminal(draft);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusTerminal(draft.id);
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
    this.referenceReview.applyFullPreviewState(this.ws, this.util, this.system, this.terminal);
  }

  private resolveNewSessionDirectory(fallbackDirectory = ''): string {
    const focusedDirectory = this.ws.getFocusedTab()?.cwd?.trim() || this.ws.workingDirectory.trim();
    const customDirectory = this.newSessionCustomPath.trim();
    const homeDirectory = this.homeDirectory.trim();

    switch (this.newSessionStartMode) {
      case 'home':
        return homeDirectory || focusedDirectory || fallbackDirectory;
      case 'custom':
        return customDirectory || focusedDirectory || homeDirectory || fallbackDirectory;
      case 'focused-tab':
      default:
        return focusedDirectory || homeDirectory || fallbackDirectory;
    }
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
