import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TimerService } from '../../services/timer.service';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-timer',
  imports: [FormsModule, DurationPipe, TranslatePipe, IconComponent],
  template: `
    <div class="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{{ 'TIMER.TITLE' | translate }}</h1>

      <!-- Timer Display -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none p-8 text-center space-y-6">
        <div class="text-7xl font-mono font-bold tracking-tight"
          [class]="isRunning() ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'">
          {{ elapsed() | duration }}
        </div>

        @if (runningEntry()) {
          <div class="text-sm text-slate-500 dark:text-slate-400">
            <span class="font-medium text-slate-700 dark:text-slate-200">{{ getProjectName(runningEntry()!.projectId) }}</span>
            <span class="mx-2">·</span>
            <span>{{ getTaskName(runningEntry()!.taskId) }}</span>
          </div>
        }

        <!-- Start/Stop Button -->
        @if (!isRunning()) {
          <button (click)="startTimer()"
            [disabled]="!selectedProjectId() || !selectedTaskId()"
            class="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
            <app-icon name="play" class="size-5" />
            {{ 'TIMER.START' | translate }}
          </button>
        } @else {
          <button (click)="stopTimer()"
            class="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">
            <app-icon name="stop" class="size-5" />
            {{ 'TIMER.STOP' | translate }}
          </button>
        }
      </div>

      <!-- Project/Task Selector -->
      @if (!isRunning()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none p-5 space-y-4">
          <h2 class="font-semibold text-slate-900 dark:text-slate-100">{{ 'TIMER.SELECT_PROJECT_TASK' | translate }}</h2>

          <!-- Project -->
          <div class="space-y-1.5">
            <label for="project-select" class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ 'TIMER.PROJECT' | translate }}</label>
            <select id="project-select" [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()"
              class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">{{ 'TIMER.SELECT_PROJECT_PLACEHOLDER' | translate }}</option>
              @for (p of projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>

          <!-- Task -->
          <div class="space-y-1.5">
            <label for="task-select" class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ 'TIMER.TASK' | translate }}</label>
            <select id="task-select" [(ngModel)]="selectedTaskId"
              [disabled]="!selectedProjectId()"
              class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
              <option value="">{{ 'TIMER.SELECT_TASK_PLACEHOLDER' | translate }}</option>
              @for (t of availableTasks(); track t.id) {
                <option [value]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Today's entries -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none">
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="font-semibold text-slate-900 dark:text-slate-100">{{ 'TIMER.TODAY' | translate }}</h2>
          <span class="text-sm font-mono text-slate-500 dark:text-slate-400">{{ todayTotal() | duration }}</span>
        </div>
        <ul class="divide-y divide-slate-100 dark:divide-slate-700" role="list">
          @for (entry of todayEntries(); track entry.id) {
            <li
              [attr.data-entry-id]="entry.id"
              [class.entry-highlight]="highlightedEntryId() === entry.id"
              class="px-5 py-3 flex items-center gap-3 rounded-lg transition-colors">
              <div class="w-2 h-2 rounded-full shrink-0" [style.background-color]="getProjectColor(entry.projectId)"></div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ getProjectName(entry.projectId) }} · {{ getTaskName(entry.taskId) }}</div>
                @if (entry.note) {
                  <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ entry.note }}</div>
                }
              </div>
              <div class="text-right shrink-0">
                <div class="text-sm font-mono text-slate-700 dark:text-slate-200">{{ entry.durationSeconds | duration }}</div>
                <div class="text-xs text-slate-400 dark:text-slate-500">{{ formatTime(entry.startTime) }} – {{ formatTime(entry.endTime!) }}</div>
              </div>
            </li>
          }
          @empty {
            <li class="px-5 py-6 text-center text-slate-400 dark:text-slate-500 text-sm">{{ 'TIMER.NO_ENTRIES_TODAY' | translate }}</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class TimerComponent implements OnInit {
  private readonly timerService = inject(TimerService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly projectService = inject(ProjectService);
  private readonly route = inject(ActivatedRoute);

  readonly isRunning = this.timerService.isRunning;
  readonly elapsed = this.timerService.elapsed;
  readonly runningEntry = this.timeEntryService.runningEntry;

  selectedProjectId = signal('');
  selectedTaskId = signal('');

  /** ID of the most recently stopped entry, for highlight + focus. Cleared after the animation. */
  private readonly stoppedEntryId = signal<string | null>(null);
  readonly highlightedEntryId = computed(() => this.stoppedEntryId());

  readonly projects = this.projectService.activeProjects;

  readonly availableTasks = computed(() => {
    const pid = this.selectedProjectId();
    if (!pid) return [];
    return this.projectService.tasksForProject(pid);
  });

  readonly todayEntries = computed(() => {
    return [...this.timeEntryService.entriesForDay(new Date())]
      .filter((e) => e.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  });

  readonly todayTotal = computed(() =>
    this.todayEntries().reduce((s, e) => s + e.durationSeconds, 0)
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['projectId']) this.selectedProjectId.set(params['projectId']);
    if (params['taskId']) this.selectedTaskId.set(params['taskId']);
  }

  onProjectChange(): void {
    this.selectedTaskId.set('');
  }

  async startTimer(): Promise<void> {
    const pid = this.selectedProjectId();
    const tid = this.selectedTaskId();
    if (!pid || !tid) return;
    await this.timerService.start(pid, tid);
  }

  async stopTimer(): Promise<void> {
    const entry = await this.timerService.stop();
    if (entry) {
      this.stoppedEntryId.set(entry.id);
      setTimeout(() => {
        if (this.stoppedEntryId() === entry!.id) {
          this.stoppedEntryId.set(null);
        }
      }, 2600);
    }
  }

  getProjectName(id: string): string {
    return this.projectService.getProject(id)?.name ?? '-';
  }

  getProjectColor(id: string): string {
    return this.projectService.getProject(id)?.color ?? '#6b7280';
  }

  getTaskName(id: string): string {
    return this.projectService.getTask(id)?.name ?? '-';
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
}
