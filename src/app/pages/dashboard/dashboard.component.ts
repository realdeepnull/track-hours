import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { TimerService } from '../../services/timer.service';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DurationPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-100">{{ 'DASHBOARD.TITLE' | translate }}</h1>
        <span class="text-sm text-slate-400">{{ today() }}</span>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (stat of stats(); track stat.labelKey) {
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{{ stat.labelKey | translate }}</div>
            <div class="text-2xl font-bold text-slate-100 font-mono">{{ stat.value }}</div>
            @if (stat.subKey) {
              <div class="text-xs text-slate-500 mt-0.5">{{ stat.subKey | translate: stat.subParams }}</div>
            }
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent entries -->
        <div class="bg-slate-800 rounded-xl border border-slate-700">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 class="font-semibold text-slate-100">{{ 'DASHBOARD.RECENT_ENTRIES' | translate }}</h2>
            <a routerLink="/entries" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{{ 'DASHBOARD.VIEW_ALL' | translate }}</a>
          </div>
          <ul class="divide-y divide-slate-700/50" role="list">
            @for (entry of recentEntries(); track entry.id) {
              <li class="px-5 py-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-medium text-slate-100 truncate">
                    {{ getProjectName(entry.projectId) }}
                  </div>
                  <div class="text-xs text-slate-400 truncate">{{ getTaskName(entry.taskId) }}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-sm font-mono text-slate-200">{{ entry.durationSeconds | duration }}</div>
                  <div class="text-xs text-slate-500">{{ formatEntryDate(entry.startTime) }}</div>
                </div>
              </li>
            }
            @empty {
              <li class="px-5 py-8 text-center text-slate-500 text-sm">{{ 'DASHBOARD.NO_ENTRIES' | translate }}</li>
            }
          </ul>
        </div>

        <!-- Projects overview -->
        <div class="bg-slate-800 rounded-xl border border-slate-700">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 class="font-semibold text-slate-100">{{ 'DASHBOARD.PROJECTS_THIS_WEEK' | translate }}</h2>
            <a routerLink="/projects" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{{ 'DASHBOARD.MANAGE' | translate }}</a>
          </div>
          <ul class="divide-y divide-slate-700/50 p-3 space-y-1" role="list">
            @for (p of weeklyProjectStats(); track p.id) {
              <li class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-700/40 transition-colors">
                <div class="w-3 h-3 rounded-full shrink-0" [style.background-color]="p.color"></div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-slate-200 truncate">{{ p.name }}</div>
                  <div class="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                      [style.width.%]="p.percentage"
                      [style.background-color]="p.color">
                    </div>
                  </div>
                </div>
                <div class="shrink-0 text-xs font-mono text-slate-300">{{ p.totalSeconds | duration }}</div>
              </li>
            }
            @empty {
              <li class="px-2 py-8 text-center text-slate-500 text-sm">{{ 'DASHBOARD.NO_PROJECT_DATA' | translate }}</li>
            }
          </ul>
        </div>
      </div>

      <!-- Quick start -->
      @if (suggestions().length > 0) {
        <div class="bg-slate-800 rounded-xl border border-slate-700">
          <div class="px-5 py-4 border-b border-slate-700">
            <h2 class="font-semibold text-slate-100">{{ 'DASHBOARD.QUICK_START' | translate }}</h2>
            <p class="text-xs text-slate-400 mt-0.5">{{ 'DASHBOARD.QUICK_START_HINT' | translate }}</p>
          </div>
          <div class="p-4 flex flex-wrap gap-2">
            @for (s of suggestions(); track s.taskId) {
              <a [routerLink]="['/timer']" [queryParams]="{ projectId: s.projectId, taskId: s.taskId }"
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm text-slate-200 border border-slate-600">
                <div class="w-2 h-2 rounded-full" [style.background-color]="s.color"></div>
                <span class="font-medium">{{ s.projectName }}</span>
                <span class="text-slate-400">·</span>
                <span>{{ s.taskName }}</span>
              </a>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent {
  private readonly timerService = inject(TimerService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly projectService = inject(ProjectService);
  private readonly translateService = inject(TranslateService);

  private readonly langSignal = toSignal(
    this.translateService.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translateService.getCurrentLang() ?? 'de')
    )
  );

  readonly today = computed(() => {
    const lang = this.langSignal();
    const locale = lang === 'en' ? 'en-US' : 'de-DE';
    return new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  readonly stats = computed(() => {
    const now = new Date();
    const dayStart = startOfDay(now).getTime();
    const weekStart = startOfWeek(now, { locale: de }).getTime();
    const monthStart = startOfMonth(now).getTime();

    const entries = this.timeEntryService.entries().filter((e) => e.endTime);
    const todayEntries = entries.filter((e) => new Date(e.startTime).getTime() >= dayStart);
    const todaySecs = todayEntries.reduce((s, e) => s + e.durationSeconds, 0);
    const weekSecs = entries.filter((e) => new Date(e.startTime).getTime() >= weekStart).reduce((s, e) => s + e.durationSeconds, 0);
    const monthSecs = entries.filter((e) => new Date(e.startTime).getTime() >= monthStart).reduce((s, e) => s + e.durationSeconds, 0);

    const fmt = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}h ${m}m`;
    };

    interface Stat { labelKey: string; value: string; subKey: string | null; subParams: Record<string, unknown> | null }
    const result: Stat[] = [
      { labelKey: 'DASHBOARD.STAT_TODAY', value: fmt(todaySecs), subKey: 'DASHBOARD.ENTRIES_COUNT', subParams: { count: todayEntries.length } },
      { labelKey: 'DASHBOARD.STAT_WEEK', value: fmt(weekSecs), subKey: null, subParams: null },
      { labelKey: 'DASHBOARD.STAT_MONTH', value: fmt(monthSecs), subKey: null, subParams: null },
      { labelKey: 'DASHBOARD.STAT_PROJECTS', value: this.projectService.activeProjects().length.toString(), subKey: 'DASHBOARD.ACTIVE', subParams: null },
    ];
    return result;
  });

  readonly recentEntries = computed(() =>
    [...this.timeEntryService.entries()]
      .filter((e) => e.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 6)
  );

  readonly weeklyProjectStats = computed(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: de }).getTime();
    const weekEntries = this.timeEntryService.entries().filter(
      (e) => e.endTime && new Date(e.startTime).getTime() >= weekStart
    );

    const projects = this.projectService.activeProjects();
    const stats = projects.map((p) => {
      const totalSeconds = weekEntries
        .filter((e) => e.projectId === p.id)
        .reduce((s, e) => s + e.durationSeconds, 0);
      return { ...p, totalSeconds };
    }).filter((p) => p.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const max = stats[0]?.totalSeconds ?? 1;
    return stats.map((s) => ({ ...s, percentage: Math.round((s.totalSeconds / max) * 100) }));
  });

  readonly suggestions = computed(() => {
    const entries = [...this.timeEntryService.entries()]
      .filter((e) => e.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const seen = new Set<string>();
    const result: { projectId: string; taskId: string; projectName: string; taskName: string; color: string }[] = [];
    for (const e of entries) {
      const key = `${e.projectId}:${e.taskId}`;
      if (!seen.has(key)) {
        seen.add(key);
        const project = this.projectService.getProject(e.projectId);
        const task = this.projectService.getTask(e.taskId);
        if (project && task) {
          result.push({ projectId: e.projectId, taskId: e.taskId, projectName: project.name, taskName: task.name, color: project.color });
        }
      }
      if (result.length >= 5) break;
    }
    return result;
  });

  getProjectName(id: string): string {
    return this.projectService.getProject(id)?.name ?? '–';
  }

  getTaskName(id: string): string {
    return this.projectService.getTask(id)?.name ?? '–';
  }

  formatEntryDate(iso: string): string {
    const locale = this.translateService.getCurrentLang() === 'en' ? 'en-US' : 'de-DE';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
