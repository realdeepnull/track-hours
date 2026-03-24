export type TaskCategory =
  | 'development'
  | 'design'
  | 'meeting'
  | 'testing'
  | 'management'
  | 'research'
  | 'other';

export const TASK_CATEGORIES: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'development', label: 'Entwicklung', color: '#6366f1' },
  { value: 'design', label: 'Design', color: '#ec4899' },
  { value: 'meeting', label: 'Meeting', color: '#f59e0b' },
  { value: 'testing', label: 'Testing', color: '#10b981' },
  { value: 'management', label: 'Verwaltung', color: '#3b82f6' },
  { value: 'research', label: 'Recherche', color: '#8b5cf6' },
  { value: 'other', label: 'Sonstiges', color: '#6b7280' },
];

export interface Task {
  id: string;
  projectId: string;
  name: string;
  category: TaskCategory;
  description?: string;
  createdAt: string; // ISO string
  archived: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string; // ISO string
  archived: boolean;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  startTime: string; // ISO string
  endTime: string | null; // null = running
  durationSeconds: number; // 0 while running
  note?: string;
  createdAt: string;
}

export interface AppSettings {
  reminderEnabled: boolean;
  reminderIntervalMinutes: number;
  autoSuggestLastUsed: boolean;
  theme: 'dark' | 'light';
  language: 'de' | 'en';
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: true,
  reminderIntervalMinutes: 60,
  autoSuggestLastUsed: true,
  theme: 'dark',
  language: 'de',
};

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#3b82f6', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];
