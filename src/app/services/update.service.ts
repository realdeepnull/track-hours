import { Service, signal } from '@angular/core';

@Service()
export class UpdateService {
  readonly availableVersion = signal<string | null>(null);
  readonly downloadReady = signal(false);
  readonly updateError = signal<string | null>(null);
  readonly downloadPercent = signal<number | null>(null);

  init(): void {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateAvailable((version: string) => {
      this.availableVersion.set(version);
    });

    api.onUpdateDownloaded(() => {
      this.downloadReady.set(true);
    });

    api.onUpdateError?.((message: string) => {
      this.updateError.set(message);
    });

    api.onUpdateProgress?.((percent: number) => {
      this.downloadPercent.set(percent);
    });
  }

  install(): void {
    window.electronAPI?.installUpdate();
  }
}
