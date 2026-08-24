import { Service, signal } from '@angular/core';

@Service()
export class UpdateService {
  readonly availableVersion = signal<string | null>(null);
  readonly downloadReady = signal(false);
  readonly updateError = signal<string | null>(null);
  readonly downloadPercent = signal<number | null>(null);

  async init(): Promise<void> {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateAvailable((version: string) => {
      this.availableVersion.set(version);
    });

    api.onUpdateDownloaded(() => {
      this.downloadReady.set(true);
      this.downloadPercent.set(100);
    });

    api.onUpdateError?.((message: string) => {
      this.updateError.set(message);
    });

    api.onUpdateProgress?.((percent: number) => {
      this.downloadPercent.set(percent);
    });

    // Recover any update events that fired before the renderer
    // registered its IPC listeners (race condition fix).
    const status = await api.getUpdateStatus();
    if (status.downloaded) {
      this.downloadReady.set(true);
      this.downloadPercent.set(100);
    }
    if (status.availableVersion) {
      this.availableVersion.set(status.availableVersion);
    }
    if (status.error) {
      this.updateError.set(status.error);
    }
    if (status.downloadPercent !== null) {
      this.downloadPercent.set(status.downloadPercent);
    }
  }

  install(): void {
    window.electronAPI?.installUpdate();
  }

  dismissError(): void {
    this.updateError.set(null);
  }
}
