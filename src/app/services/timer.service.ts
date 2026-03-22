import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { TimeEntryService } from './time-entry.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TimerService implements OnDestroy {
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly storage = inject(StorageService);

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private reminderInterval: ReturnType<typeof setInterval> | null = null;

  readonly elapsed = signal<number>(0); // seconds since timer started
  readonly isRunning = computed(() => !!this.timeEntryService.runningEntry());

  constructor() {
    // Tick every second when running
    this.tickInterval = setInterval(() => {
      const running = this.timeEntryService.runningEntry();
      if (running) {
        const secs = Math.round(
          (Date.now() - new Date(running.startTime).getTime()) / 1000
        );
        this.elapsed.set(secs);
      } else {
        this.elapsed.set(0);
      }
    }, 1000);
  }

  async start(projectId: string, taskId: string): Promise<void> {
    await this.timeEntryService.startTimer(projectId, taskId);
    this.elapsed.set(0);
  }

  async stop(): Promise<void> {
    const entry = await this.timeEntryService.stopTimer();
    this.elapsed.set(0);
    if (entry) {
      await this.storage.notify('Zeiterfassung gestoppt', `${this.formatDuration(entry.durationSeconds)} aufgezeichnet`);
    }
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  setupReminders(intervalMinutes: number): void {
    this.clearReminders();
    if (intervalMinutes <= 0) return;
    this.reminderInterval = setInterval(async () => {
      const running = this.timeEntryService.runningEntry();
      if (!running) {
        await this.storage.notify('Zeiterfassung', 'Vergessen Sie nicht, Ihre Zeit aufzuzeichnen!');
      } else {
        const elapsed = Math.round((Date.now() - new Date(running.startTime).getTime()) / 1000);
        await this.storage.notify(
          'Timer läuft',
          `Ihr Timer läuft seit ${this.formatDuration(elapsed)}.`
        );
      }
    }, intervalMinutes * 60 * 1000);
  }

  clearReminders(): void {
    if (this.reminderInterval !== null) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  ngOnDestroy(): void {
    if (this.tickInterval !== null) clearInterval(this.tickInterval);
    this.clearReminders();
  }
}
