import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { ExportService } from '../../services/export.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { TASK_CATEGORIES, TimeEntry } from '../../models/models';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths
} from 'date-fns';
import { de } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

@Component({
  selector: 'app-entries',
  standalone: true,
  imports: [FormsModule, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-6xl mx-auto space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h1 class="text-2xl font-bold text-slate-100">Zeiteinträge</h1>
        <div class="flex items-center gap-2">
          <button (click)="openAddDialog()"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            + Eintrag hinzufügen
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
        <div class="flex rounded-lg bg-slate-900 p-1 gap-0.5" role="tablist" aria-label="Zeitraum">
          @for (tab of viewTabs; track tab.value) {
            <button role="tab" (click)="viewMode.set(tab.value)"
              [attr.aria-selected]="viewMode() === tab.value"
              class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
              [class]="viewMode() === tab.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Date navigation -->
        <div class="flex items-center gap-2 ml-auto">
          <button (click)="navigatePrev()" aria-label="Vorherige Periode"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <span class="text-sm font-medium text-slate-200 min-w-48 text-center">{{ periodLabel() }}</span>
          <button (click)="navigateNext()" aria-label="Nächste Periode"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <button (click)="goToToday()"
            class="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            Heute
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="flex flex-wrap gap-3">
        <input type="search" [(ngModel)]="searchQuery" placeholder="Suchen…"
          class="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"/>
        <select [(ngModel)]="filterProjectId"
          class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Alle Projekte</option>
          @for (p of projects(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        <select [(ngModel)]="filterCategory"
          class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Alle Kategorien</option>
          @for (cat of categories; track cat.value) {
            <option [value]="cat.value">{{ cat.label }}</option>
          }
        </select>
      </div>

      <!-- Summary Row -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">Einträge</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ filteredEntries().length }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">Gesamt</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ totalFiltered() | duration }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 text-center">
          <div class="text-xs text-slate-400 mb-1">Ø pro Tag</div>
          <div class="text-xl font-bold font-mono text-slate-100">{{ avgPerDay() | duration }}</div>
        </div>
      </div>

      <!-- Entries Table -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Zeiteinträge">
            <thead>
              <tr class="border-b border-slate-700 text-xs font-medium text-slate-400 uppercase tracking-wide">
                <th class="px-4 py-3 text-left">Datum</th>
                <th class="px-4 py-3 text-left">Zeitraum</th>
                <th class="px-4 py-3 text-left">Dauer</th>
                <th class="px-4 py-3 text-left">Projekt</th>
                <th class="px-4 py-3 text-left">Aufgabe</th>
                <th class="px-4 py-3 text-left">Kategorie</th>
                <th class="px-4 py-3 text-left">Notiz</th>
                <th class="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              @for (entry of filteredEntries(); track entry.id) {
                <tr class="hover:bg-slate-700/30 transition-colors group">
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
                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="openEditDialog(entry)"
                        class="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                        aria-label="Bearbeiten">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      @if (confirmDeleteEntryId() === entry.id) {
                        <span class="text-xs text-rose-400">Löschen?</span>
                        <button (click)="deleteEntry(entry.id)"
                          class="px-2 py-1 rounded text-xs bg-rose-600 hover:bg-rose-500 text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                          aria-label="Löschen bestätigen">
                          Ja
                        </button>
                        <button (click)="confirmDeleteEntryId.set(null)"
                          class="px-2 py-1 rounded text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                          aria-label="Löschen abbrechen">
                          Nein
                        </button>
                      } @else {
                        <button (click)="confirmDeleteEntryId.set(entry.id)"
                          class="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                          aria-label="Löschen">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr>
                  <td colspan="8" class="px-4 py-12 text-center text-slate-500">Keine Einträge für diesen Zeitraum</td>
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
        role="dialog" aria-modal="true" [attr.aria-label]="editingEntryId() ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-semibold text-slate-100">{{ editingEntryId() ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen' }}</h2>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="entry-project" class="text-sm text-slate-300">Projekt *</label>
              <select id="entry-project" [ngModel]="dProjectId()" (ngModelChange)="dProjectId.set($event); dTaskId.set('')"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">– wählen –</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="entry-task" class="text-sm text-slate-300">Aufgabe *</label>
              <select id="entry-task" [ngModel]="dTaskId()" (ngModelChange)="dTaskId.set($event)" [disabled]="!dProjectId()"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                <option value="">– wählen –</option>
                @for (t of dialogTasks(); track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="entry-start" class="text-sm text-slate-300">Start *</label>
              <input id="entry-start" type="datetime-local" [(ngModel)]="dStartTime"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div class="space-y-1.5">
              <label for="entry-end" class="text-sm text-slate-300">Ende *</label>
              <input id="entry-end" type="datetime-local" [(ngModel)]="dEndTime"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="entry-note" class="text-sm text-slate-300">Notiz</label>
            <input id="entry-note" type="text" [(ngModel)]="dNote" placeholder="Optional"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="saveEntry()" [disabled]="!dProjectId() || !dTaskId() || !dStartTime || !dEndTime"
              class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
              Speichern
            </button>
            <button (click)="closeDialog()"
              class="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
              Abbrechen
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

  readonly projects = this.projectService.activeProjects;
  readonly categories = TASK_CATEGORIES;

  viewMode = signal<ViewMode>('week');
  currentDate = signal(new Date());
  searchQuery = '';
  filterProjectId = '';
  filterCategory = '';

  readonly viewTabs = [
    { value: 'day' as ViewMode, label: 'Tag' },
    { value: 'week' as ViewMode, label: 'Woche' },
    { value: 'month' as ViewMode, label: 'Monat' },
  ];

  readonly periodLabel = computed(() => {
    const d = this.currentDate();
    switch (this.viewMode()) {
      case 'day': return format(d, 'EEEE, d. MMMM yyyy', { locale: de });
      case 'week': {
        const ws = startOfWeek(d, { locale: de });
        const we = endOfWeek(d, { locale: de });
        return `${format(ws, 'd. MMM', { locale: de })} – ${format(we, 'd. MMM yyyy', { locale: de })}`;
      }
      case 'month': return format(d, 'MMMM yyyy', { locale: de });
    }
  });

  readonly periodEntries = computed(() => {
    const d = this.currentDate();
    let from: Date, to: Date;
    switch (this.viewMode()) {
      case 'day': from = startOfDay(d); to = endOfDay(d); break;
      case 'week': from = startOfWeek(d, { locale: de }); to = endOfWeek(d, { locale: de }); break;
      case 'month': from = startOfMonth(d); to = endOfMonth(d); break;
    }
    return this.timeEntryService.entriesForRange(from, to)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  });

  readonly filteredEntries = computed(() => {
    const search = this.searchQuery.toLowerCase();
    const proj = this.filterProjectId;
    const cat = this.filterCategory;
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
  dStartTime = '';
  dEndTime = '';
  dNote = '';

  readonly dialogTasks = computed(() => {
    if (!this.dProjectId()) return [];
    return this.projectService.tasksForProject(this.dProjectId());
  });

  openAddDialog(): void {
    this.editingEntryId.set(null);
    const now = new Date();
    this.dProjectId.set('');
    this.dTaskId.set('');
    this.dStartTime = this.toLocalDatetimeString(now);
    this.dEndTime = this.toLocalDatetimeString(now);
    this.dNote = '';
    this.showDialog.set(true);
  }

  openEditDialog(entry: TimeEntry): void {
    this.editingEntryId.set(entry.id);
    this.dProjectId.set(entry.projectId);
    this.dTaskId.set(entry.taskId);
    this.dStartTime = this.toLocalDatetimeString(new Date(entry.startTime));
    this.dEndTime = entry.endTime ? this.toLocalDatetimeString(new Date(entry.endTime)) : '';
    this.dNote = entry.note ?? '';
    this.showDialog.set(true);
  }

  closeDialog(): void { this.showDialog.set(false); }

  async saveEntry(): Promise<void> {
    const start = new Date(this.dStartTime).toISOString();
    const end = new Date(this.dEndTime).toISOString();
    const id = this.editingEntryId();
    if (id) {
      await this.timeEntryService.updateEntry(id, {
        projectId: this.dProjectId(),
        taskId: this.dTaskId(),
        startTime: start,
        endTime: end,
        note: this.dNote || undefined,
      });
    } else {
      await this.timeEntryService.addEntry(this.dProjectId(), this.dTaskId(), start, end, this.dNote);
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
    return format(new Date(iso), 'dd.MM.yyyy', { locale: de });
  }

  formatTime(iso: string): string {
    return format(new Date(iso), 'HH:mm');
  }

  private toLocalDatetimeString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
