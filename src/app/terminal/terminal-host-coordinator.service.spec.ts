import { TestBed } from '@angular/core/testing';

import { TerminalHostCoordinatorService } from './terminal-host-coordinator.service';
import { TerminalSessionService } from './terminal-session.service';

describe('TerminalHostCoordinatorService', () => {
  let coordinator: TerminalHostCoordinatorService;
  let terminal: jasmine.SpyObj<TerminalSessionService>;
  let restoreCalls = 0;
  let inFlightRestores = 0;
  let maxInFlightRestores = 0;

  beforeEach(() => {
    restoreCalls = 0;
    inFlightRestores = 0;
    maxInFlightRestores = 0;
    terminal = jasmine.createSpyObj<TerminalSessionService>('TerminalSessionService', [
      'setTerminalHosts',
      'restorePaneSessions',
    ]);
    terminal.restorePaneSessions.and.callFake(async () => {
      restoreCalls += 1;
      inFlightRestores += 1;
      maxInFlightRestores = Math.max(maxInFlightRestores, inFlightRestores);
      await new Promise((resolve) => setTimeout(resolve, 25));
      inFlightRestores -= 1;
    });

    TestBed.configureTestingModule({
      providers: [
        TerminalHostCoordinatorService,
        { provide: TerminalSessionService, useValue: terminal },
      ],
    });

    coordinator = TestBed.inject(TerminalHostCoordinatorService);
    coordinator.registerHostResolver(() => new Map([['pane-1', document.createElement('div')]]));
  });

  it('serializes overlapping restore requests', async () => {
    await Promise.all([
      coordinator.syncAndRestore(),
      coordinator.syncAndRestore(),
      coordinator.syncAndRestore(),
    ]);

    expect(restoreCalls).toBe(3);
    expect(maxInFlightRestores).toBe(1);
    expect(terminal.setTerminalHosts).toHaveBeenCalledTimes(3);
    expect(terminal.restorePaneSessions).toHaveBeenCalledTimes(3);
  });
});
