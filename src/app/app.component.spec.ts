import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { TerminalBridgeService } from './terminal-bridge.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: TerminalBridgeService,
          useValue: {
            createSession: async () => 'terminal-1',
            sendInput: async () => undefined,
            resizeSession: async () => undefined,
            disposeSession: async () => undefined,
            onData: () => () => undefined,
            onExit: () => () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
