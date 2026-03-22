import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { TimerService } from '../../services/timer.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-bold text-slate-100">Einstellungen</h1>

      <!-- Reminders -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
        <h2 class="font-semibold text-slate-100">Erinnerungen</h2>

        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div class="text-sm font-medium text-slate-200">Erinnerungen aktivieren</div>
            <div class="text-xs text-slate-400 mt-0.5">Benachrichtigungen, wenn der Timer nicht läuft oder zu lange aktiv ist</div>
          </div>
          <button
            role="switch"
            [attr.aria-checked]="settings().reminderEnabled"
            (click)="toggle('reminderEnabled')"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            [class]="settings().reminderEnabled ? 'bg-indigo-600' : 'bg-slate-600'">
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
              [class]="settings().reminderEnabled ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </label>

        @if (settings().reminderEnabled) {
          <div class="space-y-1.5">
            <label for="reminder-interval" class="text-sm text-slate-300">Erinnerungsintervall (Minuten)</label>
            <input id="reminder-interval" type="number" min="5" max="480"
              [ngModel]="settings().reminderIntervalMinutes"
              (ngModelChange)="updateSetting('reminderIntervalMinutes', +$event)"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
        }
      </div>

      <!-- Auto-suggest -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
        <h2 class="font-semibold text-slate-100">Schnellstart</h2>

        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div class="text-sm font-medium text-slate-200">Automatische Vorschläge</div>
            <div class="text-xs text-slate-400 mt-0.5">Zuletzt verwendete Aufgaben auf dem Dashboard anzeigen</div>
          </div>
          <button
            role="switch"
            [attr.aria-checked]="settings().autoSuggestLastUsed"
            (click)="toggle('autoSuggestLastUsed')"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            [class]="settings().autoSuggestLastUsed ? 'bg-indigo-600' : 'bg-slate-600'">
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
              [class]="settings().autoSuggestLastUsed ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </label>
      </div>

      <!-- Save button -->
      <div class="flex items-center gap-3">
        <button (click)="save()"
          class="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
          Einstellungen speichern
        </button>
        @if (saved()) {
          <span class="text-sm text-emerald-400">✓ Gespeichert</span>
        }
      </div>

      <!-- About -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 text-sm text-slate-400 space-y-1">
        <div class="font-semibold text-slate-300">Track Hours v0.1.0</div>
        <div>Moderne Zeiterfassung für Einzelpersonen & kleine Teams</div>
        <div class="text-xs pt-2 text-slate-500">Daten werden lokal gespeichert.</div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly storageService = inject(StorageService);
  private readonly timerService = inject(TimerService);

  settings = signal<AppSettings>({ ...DEFAULT_SETTINGS });
  saved = signal(false);

  async ngOnInit(): Promise<void> {
    const s = await this.storageService.loadSettings();
    this.settings.set(s);
    if (s.reminderEnabled) {
      this.timerService.setupReminders(s.reminderIntervalMinutes);
    }
  }

  toggle(key: 'reminderEnabled' | 'autoSuggestLastUsed'): void {
    this.settings.update((s) => ({ ...s, [key]: !s[key] }));
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings.update((s) => ({ ...s, [key]: value }));
  }

  async save(): Promise<void> {
    const s = this.settings();
    await this.storageService.saveSettings(s);
    if (s.reminderEnabled) {
      this.timerService.setupReminders(s.reminderIntervalMinutes);
    } else {
      this.timerService.clearReminders();
    }
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
