import { Service, computed, inject, signal } from '@angular/core';
import { AppSettings } from '../models/models';
import { StorageService } from './storage.service';

export type Theme = AppSettings['theme'];

/**
 * Verwaltet das Anwendungs-Theme (light/dark) und hält das `dark`-Klassen-Flag
 * am <html>-Element synchron zum aktuellen Setting. So funktioniert Tailwind v4
 * klassenbasiertes Dark Mode (`dark:`-Varianten) zuverlässig in Electron.
 */
@Service()
export class ThemeService {
  private readonly storageService = inject(StorageService);

  readonly theme = signal<Theme>('light');

  readonly isDark = computed(() => this.theme() === 'dark');

  /** Wendet das Theme aus den geladenen Settings an (z.B. im App-OnInit). */
  applyInitial(): void {
    const theme = this.storageService.settings().theme ?? 'light';
    this.setTheme(theme);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.updateDocumentClass(theme);
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private updateDocumentClass(theme: Theme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }
}