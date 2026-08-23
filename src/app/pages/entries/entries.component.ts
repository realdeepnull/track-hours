import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { ExportService } from '../../services/export.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { IconComponent } from '../../shared/icon.component';
import { TASK_CATEGORIES, TimeEntry } from '../../models/models';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { map, startWith } from 'rxjs';

type ViewMode = 'day' | 'week' | 'month';

@Component({
  selector: 'app-entries',
  imports: [FormsModule, DurationPipe, TranslatePipe, IconComponent],
  template: `
    <div class="p-6 max-w-6xl mx-auto space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h1 class="text-2xl font-bold text-slate-100">{{ 'ENTRIES.TITLE' | translate }}</h1>
        <div class="flex items-center gap-2">
          <button (click)="openAddDialog()"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            + {{ 'ENTRIES.ADD_ENTRY' | translate }}
          </button>
          <button (click)="exportCSV()"
            class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
            CSV
          </button>
          <button (click)="exportPDF()"
            class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
            PDF
          </button>
        </div>
      </div>

      <!-- View Tabs + Navigation -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-3 flex flex-wrap items-center gap-3">
        <!-- Tabs -->
        <div class="flex rounded-lg bg-slate-900 p-1 gap-0.5" role="tablist" [attr.aria-label]="'ENTRIES.TIME_PERIOD' | translate">
          @for (tab of viewTabs; track tab.value) {
            <button role="tab" (click)="viewMode.set(tab.value)"
              [attr.aria-selected]="viewMode() === tab.value"
              class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
              [class]="viewMode() === tab.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'">
              {{ tab.label | translate }}
            </button>
          }
        </div>

        <!-- Date navigation -->
        <div class="flex items-center gap-2 ml-auto">
          <button (click)="navigatePrev()" [attr.aria-label]="'ENTRIES.PREV_PERIOD' | translate"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            <app-icon name="chevron-left" class="w-4 h-4" />
          </button>
          <span class="text-sm font-medium text-slate-200 min-w-48 text-center">{{ periodLabel() }}</span>
          <button (click)="navigateNext()" [attr.aria-label]="'ENTRIES.NEXT_PERIOD' | translate"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            <app-icon name="chevron-right" class="w-4 h-4" />
          </button>
          <button (click)="goToToday()"
            class="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            {{ 'ENTRIES.TODAY' | translate }}
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="flex flex-wrap gap-3">
        <input type="search" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" [placeholder]="'ENTRIES.SEARCH_PLACEHOLDER' | translate"
          class="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"/>
        <select [ngModel]="filterProjectId()" (ngModelChange)="filterProjectId.set($event)"
          class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{{ 'ENTRIES.ALL_PROJECTS' | translate }}</option>
          @for (p of projects(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        <select [ngModel]="filterCategory()" (ngModelChange)="filterCategory.set($event)"
          class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{{ 'ENTRIES.ALL_CATEGORIES' | translate }}</option>
          @for (cat of categories; track cat.value) {
            <option [value]="cat.value">{{ cat.label }}</option>
          }
        </select>
      </div>

      <!-- Summary Row -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">{{ 'ENTRIES.ENTRIES_LABEL' | translate }}</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ filteredEntries().length }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">{{ 'ENTRIES.TOTAL' | translate }}</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ totalFiltered() | duration }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">{{ 'ENTRIES.AVG_PER_DAY' | translate }}</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ avgPerDay() | duration }}</div>
        </div>
      </div>

      <!-- Entries Table -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" [attr.aria-label]="'ENTRIES.TITLE' | translate">
            <thead>
              <tr class="border-b border-slate-700 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.DATE' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.TIME_PERIOD' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.DURATION' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.PROJECT' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.TASK' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.CATEGORY' | translate }}</th>
                <th class="px-4 py-3 text-left">{{ 'ENTRIES.NOTE' | translate }}</th>
                <th class="px-4 py-3 text-right">{{ 'ENTRIES.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              @for (entry of filteredEntries(); track entry.id) {
                <tr class="hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 text-slate-300 whitespace-nowrap">{{ formatDate(entry.startTime) }}</td>
                  <td class="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                    {{ formatTime(entry.startTime) }} – {{ formatTime(entry.endTime!) }}
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-200 whitespace-nowrap">{{ entry.durationSeconds | duration }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full shrink-0" [style.background-color]="getProjectColor(entry.projectId)"></div>
                      <span class="text-slate-200 truncate max-w-[120px]">{{ getProjectName(entry.projectId) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-300 truncate max-w-[120px]">{{ getTaskName(entry.taskId) }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-xs font-medium"
                      [style.background-color]="getCategoryColor(entry.taskId) + '20'"
                      [style.color]="getCategoryColor(entry.taskId)">
                      {{ getCategoryLabel(entry.taskId) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-slate-500 truncate max-w-[150px]">{{ entry.note ?? '' }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button (click)="openEditDialog(entry)"
                        class="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                        [attr.aria-label]="'COMMON.EDIT' | translate">
                        <app-icon name="edit" class="w-3.5 h-3.5" />
                      </button>
                      @if (confirmDeleteEntryId() === entry.id) {
                        <span class="text-xs text-rose-400">{{ 'ENTRIES.CONFIRM_DELETE' | translate }}</span>
                        <button (click)="deleteEntry(entry.id)"
                          class="px-2 py-1 rounded text-xs bg-rose-600 hover:bg-rose-500 text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                          [attr.aria-label]="'COMMON.CONFIRM' | translate">
                          {{ 'COMMON.YES' | translate }}
                        </button>
                        <button (click)="confirmDeleteEntryId.set(null)"
                          class="px-2 py-1 rounded text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                          [attr.aria-label]="'COMMON.CANCEL' | translate">
                          {{ 'COMMON.NO' | translate }}
                        </button>
                      } @else {
                        <button (click)="confirmDeleteEntryId.set(entry.id)"
                          class="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                          [attr.aria-label]="'COMMON.DELETE' | translate">
                          <app-icon name="trash" class="w-3.5 h-3.5" />
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr>
                  <td colspan="8" class="px-4 py-12 text-center text-slate-500">{{ 'ENTRIES.NO_ENTRIES_PERIOD' | translate }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Entry Dialog -->
    @if (showDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog" aria-modal="true" [attr.aria-label]="(editingEntryId() ? 'ENTRIES.EDIT_ENTRY' : 'ENTRIES.ADD_ENTRY') | translate">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-semibold text-slate-100">{{ (editingEntryId() ? 'ENTRIES.EDIT_ENTRY' : 'ENTRIES.ADD_ENTRY') | translate }}</h2>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="entry-project" class="text-sm text-slate-300">{{ 'ENTRIES.PROJECT' | translate }} *</label>
              <select id="entry-project" [ngModel]="dProjectId()" (ngModelChange)="dProjectId.set($event); dTaskId.set('')"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{{ 'ENTRIES.SELECT' | translate }}</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="entry-task" class="text-sm text-slate-300">{{ 'ENTRIES.TASK' | translate }} *</label>
              <select id="entry-task" [ngModel]="dTaskId()" (ngModelChange)="dTaskId.set($event)" [disabled]="!dProjectId()"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                <option value="">{{ 'ENTRIES.SELECT' | translate }}</option>
                @for (t of dialogTasks(); track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="entry-start" class="text-sm text-slate-300">{{ 'ENTRIES.START' | translate }} *</label>
              <input id="entry-start" type="datetime-local" [ngModel]="dStartTime()" (ngModelChange)="dStartTime.set($event)"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div class="space-y-1.5">
              <label for="entry-end" class="text-sm text-slate-300">{{ 'ENTRIES.END' | translate }} *</label>
              <input id="entry-end" type="datetime-local" [ngModel]="dEndTime()" (ngModelChange)="dEndTime.set($event)"
                [class]="dEndBeforeStart() ? 'w-full bg-slate-700 border border-rose-500 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500' : 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'"/>
              @if (dEndBeforeStart()) {
                <p class="text-xs text-rose-400" role="alert">{{ 'ENTRIES.END_BEFORE_START' | translate }}</p>
              }
            </div>
          </div>

          <div class="space-y-1.5">
              <label for="entry-note" class="text-sm text-slate-300">{{ 'ENTRIES.NOTE' | translate }}</label>
              <input id="entry-note" type="text" [ngModel]="dNote()" (ngModelChange)="dNote.set($event)" [placeholder]="'ENTRIES.OPTIONAL' | translate"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="saveEntry()" [disabled]="!dProjectId() || !dTaskId() || !dStartTime() || !dEndTime() || dEndBeforeStart()"
              class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
              {{ 'COMMON.SAVE' | translate }}
            </button>
            <button (click)="closeDialog()"
              class="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EntriesComponent {
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly projectService = inject(ProjectService);
  private readonly exportService = inject(ExportService);
  private readonly translateService = inject(TranslateService);

  private readonly langSignal = toSignal(
    this.translateService.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translateService.getCurrentLang() ?? 'de')
    )
  );
  private readonly dateLocale = computed(() => this.langSignal() === 'en' ? enUS : de);

  readonly projects = this.projectService.activeProjects;
  readonly categories = TASK_CATEGORIES;

  viewMode = signal<ViewMode>('week');
  currentDate = signal(new Date());
  searchQuery = signal('');
  filterProjectId = signal('');
  filterCategory = signal('');

  readonly viewTabs = [
    { value: 'day' as ViewMode, label: 'ENTRIES.VIEW_DAY' },
    { value: 'week' as ViewMode, label: 'ENTRIES.VIEW_WEEK' },
    { value: 'month' as ViewMode, label: 'ENTRIES.VIEW_MONTH' },
  ];

  readonly periodLabel = computed(() => {
    const d = this.currentDate();
    switch (this.viewMode()) {
      case 'day': return format(d, 'EEEE, d. MMMM yyyy', { locale: this.dateLocale() });
      case 'week': {
        const locale = this.dateLocale();
        const ws = startOfWeek(d, { locale });
        const we = endOfWeek(d, { locale });
        return `${format(ws, 'd. MMM', { locale })} – ${format(we, 'd. MMM yyyy', { locale })}`;
      }
      case 'month': return format(d, 'MMMM yyyy', { locale: this.dateLocale() });
    }
  });

  readonly periodEntries = computed(() => {
    const d = this.currentDate();
    let from: Date, to: Date;
    switch (this.viewMode()) {
      case 'day': from = startOfDay(d); to = endOfDay(d); break;
      case 'week': {
        const loc = this.dateLocale();
        from = startOfWeek(d, { locale: loc });
        to = endOfWeek(d, { locale: loc });
        break;
      }
      case 'month': from = startOfMonth(d); to = endOfMonth(d); break;
    }
    return this.timeEntryService.entriesForRange(from, to)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  });

  readonly filteredEntries = computed(() => {
    const search = this.searchQuery().toLowerCase();
    const proj = this.filterProjectId();
    const cat = this.filterCategory();
    return this.periodEntries().filter((e) => {
      if (proj && e.projectId !== proj) return false;
      if (cat) {
        const task = this.projectService.getTask(e.taskId);
        if (task?.category !== cat) return false;
      }
      if (search) {
        const pName = this.getProjectName(e.projectId).toLowerCase();
        const tName = this.getTaskName(e.taskId).toLowerCase();
        const note = (e.note ?? '').toLowerCase();
        if (!pName.includes(search) && !tName.includes(search) && !note.includes(search)) return false;
      }
      return true;
    });
  });

  readonly totalFiltered = computed(() =>
    this.filteredEntries().reduce((s, e) => s + e.durationSeconds, 0)
  );

  readonly avgPerDay = computed(() => {
    const days = this.viewMode() === 'day' ? 1 : this.viewMode() === 'week' ? 7 : 30;
    return Math.round(this.totalFiltered() / days);
  });

  // Navigation
  navigatePrev(): void {
    const d = this.currentDate();
    switch (this.viewMode()) {
      case 'day': this.currentDate.set(subDays(d, 1)); break;
      case 'week': this.currentDate.set(subWeeks(d, 1)); break;
      case 'month': this.currentDate.set(subMonths(d, 1)); break;
    }
  }

  navigateNext(): void {
    const d = this.currentDate();
    switch (this.viewMode()) {
      case 'day': this.currentDate.set(addDays(d, 1)); break;
      case 'week': this.currentDate.set(addWeeks(d, 1)); break;
      case 'month': this.currentDate.set(addMonths(d, 1)); break;
    }
  }

  goToToday(): void { this.currentDate.set(new Date()); }

  // Export
  async exportCSV(): Promise<void> {
    await this.exportService.exportCSV(
      this.filteredEntries(),
      this.projectService.projects(),
      this.projectService.tasks(),
      `zeiterfassung-${format(this.currentDate(), 'yyyy-MM')}.csv`
    );
  }

  async exportPDF(): Promise<void> {
    await this.exportService.exportPDF(
      this.filteredEntries(),
      this.projectService.projects(),
      this.projectService.tasks(),
      this.periodLabel(),
      `zeiterfassung-${format(this.currentDate(), 'yyyy-MM')}.pdf`
    );
  }

  // Dialog
  showDialog = signal(false);
  editingEntryId = signal<string | null>(null);
  confirmDeleteEntryId = signal<string | null>(null);
  dProjectId = signal('');
  dTaskId = signal('');
  dStartTime = signal('');
  dEndTime = signal('');
  dNote = signal('');

  readonly dEndBeforeStart = computed(() =>
    !!this.dStartTime() && !!this.dEndTime() &&
    new Date(this.dEndTime()) <= new Date(this.dStartTime())
  );

  readonly dialogTasks = computed(() => {
    if (!this.dProjectId()) return [];
    return this.projectService.tasksForProject(this.dProjectId());
  });

  openAddDialog(): void {
    this.editingEntryId.set(null);
    const now = new Date();
    this.dProjectId.set('');
    this.dTaskId.set('');
    this.dStartTime.set(this.toLocalDatetimeString(now));
    this.dEndTime.set(this.toLocalDatetimeString(now));
    this.dNote.set('');
    this.showDialog.set(true);
  }

  openEditDialog(entry: TimeEntry): void {
    this.editingEntryId.set(entry.id);
    this.dProjectId.set(entry.projectId);
    this.dTaskId.set(entry.taskId);
    this.dStartTime.set(this.toLocalDatetimeString(new Date(entry.startTime)));
    this.dEndTime.set(entry.endTime ? this.toLocalDatetimeString(new Date(entry.endTime)) : '');
    this.dNote.set(entry.note ?? '');
    this.showDialog.set(true);
  }

  closeDialog(): void { this.showDialog.set(false); }

  async saveEntry(): Promise<void> {
    if (this.dEndBeforeStart()) return;
    const start = new Date(this.dStartTime()).toISOString();
    const end = new Date(this.dEndTime()).toISOString();
    const id = this.editingEntryId();
    if (id) {
      await this.timeEntryService.updateEntry(id, {
        projectId: this.dProjectId(),
        taskId: this.dTaskId(),
        startTime: start,
        endTime: end,
        note: this.dNote() || undefined,
      });
    } else {
      await this.timeEntryService.addEntry(this.dProjectId(), this.dTaskId(), start, end, this.dNote());
    }
    this.closeDialog();
  }

  async deleteEntry(id: string): Promise<void> {
    this.confirmDeleteEntryId.set(null);
    await this.timeEntryService.deleteEntry(id);
  }

  // Helpers
  getProjectName(id: string): string { return this.projectService.getProject(id)?.name ?? '–'; }
  getProjectColor(id: string): string { return this.projectService.getProject(id)?.color ?? '#6b7280'; }
  getTaskName(id: string): string { return this.projectService.getTask(id)?.name ?? '–'; }

  getCategoryLabel(taskId: string): string {
    const task = this.projectService.getTask(taskId);
    return TASK_CATEGORIES.find((c) => c.value === task?.category)?.label ?? '–';
  }

  getCategoryColor(taskId: string): string {
    const task = this.projectService.getTask(taskId);
    return TASK_CATEGORIES.find((c) => c.value === task?.category)?.color ?? '#6b7280';
  }

  formatDate(iso: string): string {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: this.dateLocale() });
  }

  formatTime(iso: string): string {
    return format(new Date(iso), 'HH:mm');
  }

  private toLocalDatetimeString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
