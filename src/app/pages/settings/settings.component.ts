import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StorageService } from '../../services/storage.service';
import { TimerService } from '../../services/timer.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/models';
import { version } from '../../../../package.json';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="p-6 max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-bold text-slate-100">{{ 'SETTINGS.TITLE' | translate }}</h1>

      <!-- Language -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
        <h2 class="font-semibold text-slate-100">{{ 'SETTINGS.LANGUAGE' | translate }}</h2>
        <div class="flex gap-3">
          @for (lang of languages; track lang.value) {
            <button
              type="button"
              (click)="updateSetting('language', lang.value)"
              [attr.aria-pressed]="settings().language === lang.value"
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
              [class]="
                settings().language === lang.value
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
              "
            >
              {{ lang.label }}
            </button>
          }
        </div>
      </div>

      <!-- Reminders -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
        <h2 class="font-semibold text-slate-100">{{ 'SETTINGS.REMINDERS' | translate }}</h2>

        <div class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div id="reminders-enable-label" class="text-sm font-medium text-slate-200">
              {{ 'SETTINGS.REMINDERS_ENABLE' | translate }}
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              {{ 'SETTINGS.REMINDERS_HINT' | translate }}
            </div>
          </div>
          <button
            role="switch"
            aria-labelledby="reminders-enable-label"
            [attr.aria-checked]="settings().reminderEnabled"
            (click)="toggle('reminderEnabled')"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            [class]="settings().reminderEnabled ? 'bg-indigo-600' : 'bg-slate-600'"
          >
            <span
              class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
              [class]="settings().reminderEnabled ? 'translate-x-6' : 'translate-x-1'"
            ></span>
          </button>
        </div>

        @if (settings().reminderEnabled) {
          <div class="space-y-1.5">
            <label for="reminder-interval" class="text-sm text-slate-300">{{
              'SETTINGS.REMINDER_INTERVAL' | translate
            }}</label>
            <input
              id="reminder-interval"
              type="number"
              min="5"
              max="480"
              [ngModel]="settings().reminderIntervalMinutes"
              (ngModelChange)="updateSetting('reminderIntervalMinutes', +$event)"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        }
      </div>

      <!-- Auto-suggest -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
        <h2 class="font-semibold text-slate-100">{{ 'SETTINGS.QUICK_START' | translate }}</h2>

        <div class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div id="auto-suggest-label" class="text-sm font-medium text-slate-200">
              {{ 'SETTINGS.AUTO_SUGGEST' | translate }}
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              {{ 'SETTINGS.AUTO_SUGGEST_HINT' | translate }}
            </div>
          </div>
          <button
            role="switch"
            aria-labelledby="auto-suggest-label"
            [attr.aria-checked]="settings().autoSuggestLastUsed"
            (click)="toggle('autoSuggestLastUsed')"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            [class]="settings().autoSuggestLastUsed ? 'bg-indigo-600' : 'bg-slate-600'"
          >
            <span
              class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
              [class]="settings().autoSuggestLastUsed ? 'translate-x-6' : 'translate-x-1'"
            ></span>
          </button>
        </div>
      </div>

      <!-- Save button -->
      <div class="flex items-center gap-3">
        <button
          (click)="save()"
          class="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          {{ 'SETTINGS.SAVE' | translate }}
        </button>
        @if (saved()) {
          <span class="text-sm text-emerald-400">✓ {{ 'SETTINGS.SAVED' | translate }}</span>
        }
      </div>

      <!-- About -->
      <div
        class="bg-slate-800 rounded-xl border border-slate-700 p-5 text-sm text-slate-400 space-y-1"
      >
        <div class="font-semibold text-slate-300">Track Hours v{{ appVersion }}</div>
        <div>{{ 'SETTINGS.ABOUT_DESC' | translate }}</div>
        <div class="text-xs pt-2 text-slate-500">{{ 'SETTINGS.ABOUT_STORAGE' | translate }}</div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly storageService = inject(StorageService);
  private readonly timerService = inject(TimerService);
  private readonly translateService = inject(TranslateService);

  readonly settings = signal<AppSettings>({ ...DEFAULT_SETTINGS });
  readonly saved = signal(false);

  readonly appVersion = version;

  readonly languages: { value: 'de' | 'en'; label: string }[] = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
  ];

  async ngOnInit(): Promise<void> {
    // Settings were already loaded by App component; sync the local form signal.
    const s = this.storageService.settings();
    // The translateService reflects the currently active language (which may
    // have been changed via updateSetting without saving yet). Prefer it over
    // the persisted value so the correct language button is highlighted.
    const activeLang = this.translateService.getCurrentLang() as 'de' | 'en' | null;
    const language = activeLang ?? s.language ?? DEFAULT_SETTINGS.language;
    this.settings.set({ ...DEFAULT_SETTINGS, ...s, language });
  }

  toggle(key: 'reminderEnabled' | 'autoSuggestLastUsed'): void {
    this.settings.update((s) => ({ ...s, [key]: !s[key] }));
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings.update((s) => ({ ...s, [key]: value }));
    // Apply language changes immediately so the user sees the result without saving
    if (key === 'language') {
      this.translateService.use(value as 'de' | 'en');
    }
  }

  async save(): Promise<void> {
    const s = this.settings();
    await this.storageService.saveSettings(s);
    this.translateService.use(s.language);
    if (s.reminderEnabled) {
      this.timerService.setupReminders(s.reminderIntervalMinutes);
    } else {
      this.timerService.clearReminders();
    }
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
