import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  readonly availableVersion = signal<string | null>(null);
  readonly downloadReady = signal(false);

  init(): void {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateAvailable((version: string) => {
      this.availableVersion.set(version);
    });

    api.onUpdateDownloaded(() => {
      this.downloadReady.set(true);
    });
  }

  install(): void {
    window.electronAPI?.installUpdate();
  }
}
