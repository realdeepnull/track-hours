import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { ExportService } from '../../services/export.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { TASK_CATEGORIES } from '../../models/models';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DurationPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-100">{{ 'REPORTS.TITLE' | translate }}</h1>
        <div class="flex gap-2">
          <button (click)="exportCSV()"
            class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
            {{ 'REPORTS.EXPORT_CSV' | translate }}
          </button>
          <button (click)="exportPDF()"
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            {{ 'REPORTS.EXPORT_PDF' | translate }}
          </button>
        </div>
      </div>

      <!-- Date Range Picker -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-wrap gap-4 items-end">
        <div class="space-y-1.5">
          <label for="date-from" class="text-xs text-slate-400 font-medium">{{ 'REPORTS.DATE_FROM' | translate }}</label>
          <input id="date-from" type="date" [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event)"
            class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        <div class="space-y-1.5">
          <label for="date-to" class="text-xs text-slate-400 font-medium">{{ 'REPORTS.DATE_TO' | translate }}</label>
          <input id="date-to" type="date" [ngModel]="toDate()" (ngModelChange)="toDate.set($event)"
            class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        <div class="space-y-1.5">
          <label for="filter-project" class="text-xs text-slate-400 font-medium">{{ 'REPORTS.FILTER_PROJECT' | translate }}</label>
          <select id="filter-project" [ngModel]="filterProjectId()" (ngModelChange)="filterProjectId.set($event)"
            class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">{{ 'REPORTS.FILTER_ALL' | translate }}</option>
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </div>
        <div class="flex gap-2 ml-auto">
          @for (preset of presets; track preset.labelKey) {
            <button (click)="applyPreset(preset)"
              class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
              {{ preset.labelKey | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (stat of summaryStats(); track stat.labelKey) {
          <div class="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div class="text-xs text-slate-400 mb-1">{{ stat.labelKey | translate }}</div>
            <div class="text-xl font-bold text-slate-100 font-mono">{{ stat.value }}</div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Project Breakdown -->
        <div class="bg-slate-800 rounded-xl border border-slate-700">
          <div class="px-5 py-4 border-b border-slate-700">
            <h2 class="font-semibold text-slate-100">{{ 'REPORTS.BY_PROJECT' | translate }}</h2>
          </div>
          <ul class="p-4 space-y-3" role="list">
            @for (p of projectBreakdown(); track p.id) {
              <li class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" [style.background-color]="p.color"></div>
                    <span class="text-slate-200">{{ p.name }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-slate-400">{{ p.count }} {{ 'REPORTS.ENTRIES_COUNT' | translate }}</span>
                    <span class="font-mono text-slate-200">{{ p.totalSeconds | duration }}</span>
                    <span class="text-xs text-slate-500 w-10 text-right">{{ p.percentage }}%</span>
                  </div>
                </div>
                <div class="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div class="h-full rounded-full" [style.width.%]="p.percentage" [style.background-color]="p.color"></div>
                </div>
              </li>
            }
            @empty {
              <li class="text-center text-slate-500 text-sm py-4">{{ 'COMMON.NO_DATA' | translate }}</li>
            }
          </ul>
        </div>

        <!-- Category Breakdown -->
        <div class="bg-slate-800 rounded-xl border border-slate-700">
          <div class="px-5 py-4 border-b border-slate-700">
            <h2 class="font-semibold text-slate-100">{{ 'REPORTS.BY_CATEGORY' | translate }}</h2>
          </div>
          <ul class="p-4 space-y-3" role="list">
            @for (c of categoryBreakdown(); track c.value) {
              <li class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" [style.background-color]="c.color"></div>
                    <span class="text-slate-200">{{ c.label }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-mono text-slate-200">{{ c.totalSeconds | duration }}</span>
                    <span class="text-xs text-slate-500 w-10 text-right">{{ c.percentage }}%</span>
                  </div>
                </div>
                <div class="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div class="h-full rounded-full" [style.width.%]="c.percentage" [style.background-color]="c.color"></div>
                </div>
              </li>
            }
            @empty {
              <li class="text-center text-slate-500 text-sm py-4">{{ 'COMMON.NO_DATA' | translate }}</li>
            }
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class ReportsComponent {
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly projectService = inject(ProjectService);
  private readonly exportService = inject(ExportService);

  readonly projects = this.projectService.activeProjects;

  // Default to current month
  fromDate = signal(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  toDate = signal(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  filterProjectId = signal('');

  readonly presets = [
    { labelKey: 'REPORTS.PRESET_THIS_MONTH', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
    { labelKey: 'REPORTS.PRESET_LAST_MONTH', from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
    { labelKey: 'REPORTS.PRESET_LAST_3M', from: () => startOfMonth(subMonths(new Date(), 2)), to: () => endOfMonth(new Date()) },
  ];

  applyPreset(preset: { labelKey: string; from: () => Date; to: () => Date }): void {
    this.fromDate.set(format(preset.from(), 'yyyy-MM-dd'));
    this.toDate.set(format(preset.to(), 'yyyy-MM-dd'));
  }

  readonly filteredEntries = computed(() => {
    const from = new Date(this.fromDate() + 'T00:00:00');
    const to = new Date(this.toDate() + 'T23:59:59');
    let entries = this.timeEntryService.entriesForRange(from, to);
    if (this.filterProjectId()) entries = entries.filter((e) => e.projectId === this.filterProjectId());
    return entries;
  });

  readonly summaryStats = computed(() => {
    const entries = this.filteredEntries();
    const total = entries.reduce((s, e) => s + e.durationSeconds, 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const days = new Set(entries.map((e) => new Date(e.startTime).toDateString())).size;
    return [
      { labelKey: 'REPORTS.STAT_TOTAL', value: `${h}h ${m}m` },
      { labelKey: 'REPORTS.STAT_ENTRIES', value: entries.length.toString() },
      { labelKey: 'REPORTS.STAT_DAYS', value: days.toString() },
      { labelKey: 'REPORTS.STAT_AVG_PER_DAY', value: days ? `${Math.floor(total / days / 3600)}h ${Math.floor((total / days % 3600) / 60)}m` : '0h' },
    ];
  });

  readonly projectBreakdown = computed(() => {
    const entries = this.filteredEntries();
    const total = entries.reduce((s, e) => s + e.durationSeconds, 0) || 1;
    return this.projectService.projects()
      .map((p) => {
        const pEntries = entries.filter((e) => e.projectId === p.id);
        const totalSeconds = pEntries.reduce((s, e) => s + e.durationSeconds, 0);
        return { ...p, totalSeconds, count: pEntries.length, percentage: Math.round((totalSeconds / total) * 100) };
      })
      .filter((p) => p.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  readonly categoryBreakdown = computed(() => {
    const entries = this.filteredEntries();
    const total = entries.reduce((s, e) => s + e.durationSeconds, 0) || 1;
    return TASK_CATEGORIES.map((cat) => {
      const catEntries = entries.filter((e) => {
        const task = this.projectService.getTask(e.taskId);
        return task?.category === cat.value;
      });
      const totalSeconds = catEntries.reduce((s, e) => s + e.durationSeconds, 0);
      return { ...cat, totalSeconds, percentage: Math.round((totalSeconds / total) * 100) };
    })
      .filter((c) => c.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  async exportCSV(): Promise<void> {
    await this.exportService.exportCSV(
      this.filteredEntries(),
      this.projectService.projects(),
      this.projectService.tasks(),
      `bericht-${this.fromDate()}-${this.toDate()}.csv`
    );
  }

  async exportPDF(): Promise<void> {
    await this.exportService.exportPDF(
      this.filteredEntries(),
      this.projectService.projects(),
      this.projectService.tasks(),
      `${this.fromDate()} – ${this.toDate()}`,
      `bericht-${this.fromDate()}-${this.toDate()}.pdf`
    );
  }
}
