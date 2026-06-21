import { Injectable, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

import { EnvironmentVariable, SystemBridgeService, SystemMetrics } from '../system-bridge.service';

@Injectable({ providedIn: 'root' })
export class SystemMonitorService {
  systemMetrics: SystemMetrics | null = null;
  environmentVariables: EnvironmentVariable[] = [];

  private metricsIntervalId?: number;
  private readonly systemBridge = inject(SystemBridgeService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef, { optional: true });

  startMonitoring(): void {
    void this.refreshMetrics();
    this.metricsIntervalId = window.setInterval(() => {
      void this.refreshMetrics();
    }, 3000);
  }

  stopMonitoring(): void {
    if (this.metricsIntervalId) {
      window.clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = undefined;
    }
  }

  async refreshMetrics(): Promise<void> {
    try {
      this.systemMetrics = await this.systemBridge.getMetrics();
      this.changeDetectorRef?.markForCheck();
    } catch {
      this.systemMetrics = null;
    }
  }

  async refreshSessionEnvironment(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      this.environmentVariables = [];
      return;
    }

    try {
      this.environmentVariables = await this.systemBridge.getSessionEnvironment(sessionId);
    } catch {
      this.environmentVariables = [];
    }
  }

  getVisibleEnvironmentVariables(): EnvironmentVariable[] {
    return this.environmentVariables.slice(0, 12);
  }

  formatMetric(value: number | null | undefined, suffix = ''): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'n/a';
    }

    return `${value}${suffix}`;
  }

  formatTimestamp(value?: string | null): string {
    if (!value) {
      return 'n/a';
    }

    return new Date(value).toLocaleString();
  }

  formatUptime(startedAt?: string | null, endedAt?: string | null): string {
    if (!startedAt) {
      return 'n/a';
    }

    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  formatClock(value: string): string {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
