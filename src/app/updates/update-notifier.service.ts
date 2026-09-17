import { Injectable, OnDestroy, inject, signal } from '@angular/core';

import {
  UpdateBridgeService,
  UpdateStatusPayload,
  UpdateStatusPhase,
} from './update-bridge.service';

@Injectable({ providedIn: 'root' })
export class UpdateNotifierService implements OnDestroy {
  private readonly bridge = inject(UpdateBridgeService);
  private readonly statusState = signal<UpdateStatusPayload>({
    phase: 'idle',
    currentVersion: '',
    version: null,
    percent: null,
    message: null,
  });
  private unsubscribeStatus?: () => void;
  private started = false;

  readonly status = this.statusState.asReadonly();

  start(): void {
    if (this.started || !this.bridge.isAvailable()) {
      return;
    }

    this.started = true;
    void this.refresh();
    this.unsubscribeStatus = this.bridge.onStatus((payload) => {
      this.statusState.set(payload);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeStatus?.();
  }

  phase(): UpdateStatusPhase {
    return this.statusState().phase;
  }

  currentVersion(): string {
    return this.statusState().currentVersion || '';
  }

  availableVersion(): string {
    return this.statusState().version || '';
  }

  statusLabel(): string {
    const status = this.statusState();
    switch (status.phase) {
      case 'checking':
        return 'Checking for updates…';
      case 'available':
        return status.version ? `Update ${status.version} available` : 'Update available';
      case 'downloading':
        return typeof status.percent === 'number'
          ? `Downloading update… ${Math.round(status.percent)}%`
          : 'Downloading update…';
      case 'ready':
        return status.version ? `Update ${status.version} ready` : 'Update ready';
      case 'not-available':
        return 'You are up to date';
      case 'error':
        return status.message || 'Update check failed';
      default:
        return 'Updates';
    }
  }

  canRestart(): boolean {
    return this.statusState().phase === 'ready';
  }

  async checkForUpdates(): Promise<void> {
    if (!this.bridge.isAvailable()) {
      this.statusState.set({
        ...this.statusState(),
        phase: 'not-available',
        message: 'Updates are only available in the packaged desktop app.',
      });
      return;
    }

    await this.bridge.check();
  }

  async restartToUpdate(): Promise<void> {
    if (!this.bridge.isAvailable() || !this.canRestart()) {
      return;
    }

    await this.bridge.quitAndInstall();
  }

  private async refresh(): Promise<void> {
    try {
      const [version, status] = await Promise.all([
        this.bridge.getVersion(),
        this.bridge.getStatus(),
      ]);
      this.statusState.set({
        ...status,
        currentVersion: status.currentVersion || version,
      });
    } catch {
      // Bridge may be unavailable outside Electron; leave idle.
    }
  }
}
