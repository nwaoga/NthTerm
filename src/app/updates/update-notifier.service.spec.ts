import { TestBed } from '@angular/core/testing';

import { UpdateBridgeService } from './update-bridge.service';
import { UpdateNotifierService } from './update-notifier.service';

describe('UpdateNotifierService', () => {
  let bridge: {
    isAvailable: ReturnType<typeof vi.fn>;
    getVersion: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
    check: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
    onStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    bridge = {
      isAvailable: vi.fn().mockReturnValue(true),
      getVersion: vi.fn().mockResolvedValue('0.1.0-rc.6'),
      getStatus: vi.fn().mockResolvedValue({
        phase: 'idle',
        currentVersion: '0.1.0-rc.6',
        version: null,
        percent: null,
        message: null,
      }),
      check: vi.fn().mockResolvedValue({ ok: true }),
      quitAndInstall: vi.fn().mockResolvedValue({ ok: true }),
      onStatus: vi.fn().mockReturnValue(() => undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        UpdateNotifierService,
        { provide: UpdateBridgeService, useValue: bridge },
      ],
    });
  });

  it('starts listening and refreshes current version', async () => {
    const service = TestBed.inject(UpdateNotifierService);
    service.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(bridge.getVersion).toHaveBeenCalled();
    expect(bridge.onStatus).toHaveBeenCalled();
    expect(service.currentVersion()).toBe('0.1.0-rc.6');
  });

  it('exposes restart only when an update is ready', async () => {
    const service = TestBed.inject(UpdateNotifierService);
    let listener: ((payload: any) => void) | undefined;
    bridge.onStatus.mockImplementation((callback: (payload: any) => void) => {
      listener = callback;
      return () => undefined;
    });

    service.start();
    await Promise.resolve();
    listener?.({
      phase: 'ready',
      currentVersion: '0.1.0-rc.6',
      version: '0.1.0-rc.7',
      percent: 100,
      message: null,
    });

    expect(service.canRestart()).toBe(true);
    expect(service.statusLabel()).toContain('0.1.0-rc.7');
    await service.restartToUpdate();
    expect(bridge.quitAndInstall).toHaveBeenCalled();
  });
});
