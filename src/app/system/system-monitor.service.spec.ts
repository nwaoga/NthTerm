import { TestBed } from '@angular/core/testing';

import { SystemMonitorService } from './system-monitor.service';

describe('SystemMonitorService', () => {
  let service: SystemMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SystemMonitorService);
  });

  it('formats memory totals for the dock monitor', () => {
    service.systemMetrics = {
      cpuPercent: 23,
      memoryUsedGb: 6.2,
      memoryPercent: 39,
      memoryTotalGb: 16,
      diskPercent: 45,
      networkMbps: 12.4,
      networkDownloadMbps: 12.4,
      networkUploadMbps: 8.7,
      collectedAt: new Date().toISOString(),
    };

    expect(service.getMemoryDisplay()).toBe('6.2 GB / 16 GB');
    expect(service.getNetworkDisplay()).toBe('12.4 Mbps ↓ / 8.7 Mbps ↑');
    expect(service.getMetricProgress('cpu')).toBe(23);
    expect(service.getMetricProgress('disk')).toBe(45);
  });

  it('derives memory totals when only percent is available', () => {
    service.systemMetrics = {
      cpuPercent: 10,
      memoryUsedGb: 8,
      memoryPercent: 50,
      diskPercent: null,
      networkMbps: null,
      collectedAt: new Date().toISOString(),
    };

    expect(service.getMemoryTotalGb()).toBe(16);
    expect(service.getMemoryDisplay()).toBe('8 GB / 16 GB');
  });
});
