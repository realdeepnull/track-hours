import { Injectable, signal } from '@angular/core';
import { AppSettings, DEFAULT_SETTINGS, Project, Task, TimeEntry } from '../models/models';

declare global {
  interface Window {
    electronAPI?: {
      readData: (filename: string) => Promise<unknown>;
      writeData: (filename: string, data: unknown) => Promise<boolean>;
      getDataDir: () => Promise<string>;
      notify: (title: string, body: string) => Promise<void>;
      exportSave: (filename: string, content: unknown) => Promise<{ success: boolean; filePath?: string }>;
      isElectron: boolean;
    };
  }
}

const KEYS = {
  projects: 'projects.json',
  tasks: 'tasks.json',
  timeEntries: 'time-entries.json',
  settings: 'settings.json',
} as const;

const LS_KEYS = {
  projects: 'th_projects',
  tasks: 'th_tasks',
  timeEntries: 'th_time_entries',
  settings: 'th_settings',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  readonly settings = signal<AppSettings>({ ...DEFAULT_SETTINGS });

  async loadProjects(): Promise<Project[]> {
    return (await this.load<Project[]>(KEYS.projects, LS_KEYS.projects)) ?? [];
  }

  async saveProjects(projects: Project[]): Promise<void> {
    await this.save(KEYS.projects, LS_KEYS.projects, projects);
  }

  async loadTasks(): Promise<Task[]> {
    return (await this.load<Task[]>(KEYS.tasks, LS_KEYS.tasks)) ?? [];
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    await this.save(KEYS.tasks, LS_KEYS.tasks, tasks);
  }

  async loadTimeEntries(): Promise<TimeEntry[]> {
    return (await this.load<TimeEntry[]>(KEYS.timeEntries, LS_KEYS.timeEntries)) ?? [];
  }

  async saveTimeEntries(entries: TimeEntry[]): Promise<void> {
    await this.save(KEYS.timeEntries, LS_KEYS.timeEntries, entries);
  }

  async loadSettings(): Promise<AppSettings> {
    const s = (await this.load<AppSettings>(KEYS.settings, LS_KEYS.settings)) ?? { ...DEFAULT_SETTINGS };
    this.settings.set({ ...DEFAULT_SETTINGS, ...s });
    return s;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings.set(settings);
    await this.save(KEYS.settings, LS_KEYS.settings, settings);
  }

  async exportSave(filename: string, content: string | Uint8Array): Promise<{ success: boolean; filePath?: string }> {
    if (this.isElectron && window.electronAPI) {
      return window.electronAPI.exportSave(filename, Array.from(content instanceof Uint8Array ? content : new TextEncoder().encode(content)));
    }
    // Browser fallback: trigger download
    const blob = content instanceof Uint8Array
      ? new Blob([content.buffer as ArrayBuffer], { type: 'application/octet-stream' })
      : new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  }

  async notify(title: string, body: string): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.notify(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  private async load<T>(filename: string, lsKey: string): Promise<T | null> {
    if (this.isElectron && window.electronAPI) {
      return window.electronAPI.readData(filename) as Promise<T | null>;
    }
    const raw = localStorage.getItem(lsKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async save(filename: string, lsKey: string, data: unknown): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.writeData(filename, data);
      return;
    }
    localStorage.setItem(lsKey, JSON.stringify(data));
  }
}
