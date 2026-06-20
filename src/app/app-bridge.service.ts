import { Injectable } from '@angular/core';

export interface AppApi {
  quitReady(): Promise<void>;
  onBeforeQuit(listener: () => void): () => void;
}

@Injectable({ providedIn: 'root' })
export class AppBridgeService {
  quitReady(): Promise<void> {
    return this.getApi().quitReady();
  }

  onBeforeQuit(listener: () => void): () => void {
    return this.getApi().onBeforeQuit(listener);
  }

  private getApi(): AppApi {
    const api = window.nthTermDesktop?.app;
    if (!api) {
      throw new Error('Electron app bridge is not available.');
    }

    return api;
  }
}
