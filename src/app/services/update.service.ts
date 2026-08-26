import { Service, signal } from '@angular/core';

@Service()
export class UpdateService {
  readonly availableVersion = signal<string | null>(null);
  readonly downloadReady = signal(false);
  readonly updateError = signal<string | null>(null);
  readonly downloadPercent = signal<number | null>(null);
  readonly checking = signal(false);
  readonly notAvailable = signal(false);
  readonly installing = signal(false);

  async init(): Promise<void> {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateAvailable((version: string) => {
      this.availableVersion.set(version);
      this.notAvailable.set(false);
      this.checking.set(false);
    });

    api.onUpdateDownloaded(() => {
      this.downloadReady.set(true);
      this.downloadPercent.set(100);
    });

    api.onUpdateNotAvailable?.(() => {
      this.notAvailable.set(true);
      this.checking.set(false);
    });

    api.onCheckingForUpdate?.(() => {
      this.checking.set(true);
      this.notAvailable.set(false);
    });

    api.onUpdateError?.((message: string) => {
      this.updateError.set(message);
      this.checking.set(false);
      // The update has failed — clear all progress/availability signals so
      // the "downloading" banner does not reappear after the user dismisses
      // the error.
      this.availableVersion.set(null);
      this.downloadPercent.set(null);
      this.downloadReady.set(false);
    });

    api.onUpdateProgress?.((percent: number) => {
      this.downloadPercent.set(percent);
    });

    // Recover any update events that fired before the renderer
    // registered its IPC listeners (race condition fix).
    const status = await api.getUpdateStatus();
    if (status.error) {
      // An error has already occurred — only surface the error, not the
      // stale availability/progress state that preceded it.
      this.updateError.set(status.error);
    } else {
      if (status.downloaded) {
        this.downloadReady.set(true);
        this.downloadPercent.set(100);
      }
      if (status.availableVersion) {
        this.availableVersion.set(status.availableVersion);
      }
      if (status.downloadPercent !== null) {
        this.downloadPercent.set(status.downloadPercent);
      }
      if (status.checking) {
        this.checking.set(true);
      }
      if (status.notAvailable) {
        this.notAvailable.set(true);
      }
    }
  }

  install(): void {
    this.installing.set(true);
    window.electronAPI?.installUpdate();
  }

  dismissError(): void {
    this.updateError.set(null);
  }
}
