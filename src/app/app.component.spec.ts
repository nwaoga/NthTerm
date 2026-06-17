import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { TerminalBridgeService } from './terminal-bridge.service';
import { WorkspaceBridgeService } from './workspace-bridge.service';

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
        {
          provide: WorkspaceBridgeService,
          useValue: {
            getDefaultWorkspace: async () => ({
              id: 'default',
              name: 'Default Workspace',
              cwd: 'C:\\',
              shell: '',
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
            saveDefaultWorkspace: async () => ({
              id: 'default',
              name: 'Default Workspace',
              cwd: 'C:\\',
              shell: '',
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
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
