import { Service, computed, inject, signal } from '@angular/core';
import { TimeEntry } from '../models/models';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';

@Service()
export class TimeEntryService {
  private readonly storage = inject(StorageService);

  readonly entries = signal<TimeEntry[]>([]);
  readonly runningEntry = computed(() => this.entries().find((e) => e.endTime === null) ?? null);

  async init(): Promise<void> {
    const entries = await this.storage.loadTimeEntries();
    let changed = false;
    // Fix any stale running entries from previous sessions
    const fixed = entries.map((e) => {
      if (e.endTime === null) {
        changed = true;
        const start = new Date(e.startTime).getTime();
        const end = Date.now();
        return {
          ...e,
          endTime: new Date(end).toISOString(),
          durationSeconds: Math.round((end - start) / 1000),
        };
      }
      return e;
    });
    this.entries.set(fixed);
    if (changed) {
      await this.storage.saveTimeEntries(fixed);
    }
  }

  // --- Timer ---

  async startTimer(projectId: string, taskId: string): Promise<TimeEntry> {
    // Stop any running timer first
    await this.stopTimer();
    const entry: TimeEntry = {
      id: uuidv4(),
      projectId,
      taskId,
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    };
    this.entries.update((list) => [...list, entry]);
    await this.storage.saveTimeEntries(this.entries());
    return entry;
  }

  async stopTimer(): Promise<TimeEntry | null> {
    const running = this.runningEntry();
    if (!running) return null;
    const endTime = new Date().toISOString();
    const durationSeconds = Math.round(
      (new Date(endTime).getTime() - new Date(running.startTime).getTime()) / 1000
    );
    const stopped = { ...running, endTime, durationSeconds };
    this.entries.update((list) => list.map((e) => (e.id === running.id ? stopped : e)));
    await this.storage.saveTimeEntries(this.entries());
    return stopped;
  }

  // --- Manual entries ---

  async addEntry(
    projectId: string,
    taskId: string,
    startTime: string,
    endTime: string,
    note?: string
  ): Promise<TimeEntry> {
    const durationSeconds = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    );
    const entry: TimeEntry = {
      id: uuidv4(),
      projectId,
      taskId,
      startTime,
      endTime,
      durationSeconds,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.entries.update((list) => [...list, entry]);
    await this.storage.saveTimeEntries(this.entries());
    return entry;
  }

  async updateEntry(
    id: string,
    updates: Partial<Pick<TimeEntry, 'projectId' | 'taskId' | 'startTime' | 'endTime' | 'note'>>
  ): Promise<void> {
    this.entries.update((list) =>
      list.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...updates };
        // Recompute duration whenever both timestamps are present
        // and at least one of them was changed by this update
        if (updated.startTime && updated.endTime && (updates.startTime || updates.endTime)) {
          updated.durationSeconds = Math.round(
            (new Date(updated.endTime).getTime() - new Date(updated.startTime).getTime()) / 1000
          );
        }
        return updated;
      })
    );
    await this.storage.saveTimeEntries(this.entries());
  }

  async deleteEntry(id: string): Promise<void> {
    this.entries.update((list) => list.filter((e) => e.id !== id));
    await this.storage.saveTimeEntries(this.entries());
  }

  // --- Queries ---

  entriesForDay(date: Date): TimeEntry[] {
    const d = date.toDateString();
    return this.entries().filter(
      (e) => e.endTime && new Date(e.startTime).toDateString() === d
    );
  }

  entriesForRange(from: Date, to: Date): TimeEntry[] {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return this.entries().filter((e) => {
      if (!e.endTime) return false;
      const startMs = new Date(e.startTime).getTime();
      const endMs = new Date(e.endTime).getTime();
      // Include entries that overlap the range: started before the range ends
      // and ended after the range starts
      return startMs <= toMs && endMs >= fromMs;
    });
  }

  totalSecondsForProject(projectId: string, entries?: TimeEntry[]): number {
    return (entries ?? this.entries())
      .filter((e) => e.projectId === projectId && e.endTime)
      .reduce((sum, e) => sum + e.durationSeconds, 0);
  }
}
