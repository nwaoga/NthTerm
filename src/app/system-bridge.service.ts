import { Injectable } from '@angular/core';

export interface SystemMetrics {
  cpuPercent: number;
  memoryUsedGb: number;
  memoryPercent: number;
  memoryTotalGb?: number | null;
  diskPercent: number | null;
  networkMbps: number | null;
  networkDownloadMbps?: number | null;
  networkUploadMbps?: number | null;
  collectedAt: string;
}

export interface EnvironmentVariable {
  name: string;
  value: string;
}

export interface SystemApi {
  getMetrics(): Promise<SystemMetrics>;
  getSessionEnvironment(sessionId: string): Promise<EnvironmentVariable[]>;
}

@Injectable({ providedIn: 'root' })
export class SystemBridgeService {
  getMetrics(): Promise<SystemMetrics> {
    return this.getApi().getMetrics();
  }

  getSessionEnvironment(sessionId: string): Promise<EnvironmentVariable[]> {
    return this.getApi().getSessionEnvironment(sessionId);
  }

  private getApi(): SystemApi {
    const api = window.nthTermDesktop?.system;
    if (!api) {
      throw new Error('Electron system bridge is not available.');
    }

    return api;
  }
}
