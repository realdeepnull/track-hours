import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TimerService } from '../../services/timer.service';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { DurationPipe } from '../../shared/duration.pipe';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-col h-full bg-indigo-950 text-indigo-100 w-64 min-w-[16rem] select-none" aria-label="Hauptnavigation">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-indigo-800">
        <div class="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div class="font-bold text-base text-white leading-tight">Track Hours</div>
          <div class="text-xs text-indigo-300">Zeiterfassung</div>
        </div>
      </div>

      <!-- Running timer indicator -->
      @if (isRunning()) {
        <div class="mx-3 mt-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-medium text-emerald-300">Timer aktiv</span>
          </div>
          <div class="text-lg font-mono font-bold text-emerald-200 mt-0.5">
            {{ elapsed() | duration }}
          </div>
          @if (runningProjectName()) {
            <div class="text-xs text-emerald-300/70 truncate mt-0.5">{{ runningProjectName() }}</div>
          }
        </div>
      }

      <!-- Nav items -->
      <ul class="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="list">
        @for (item of navItems; track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="bg-indigo-700 text-white"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
              <span class="w-5 h-5 shrink-0" aria-hidden="true" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          </li>
        }
      </ul>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-indigo-800 text-xs text-indigo-500">
        Track Hours v0.1.0
      </div>
    </nav>
  `,
})
export class SidebarComponent {
  private readonly timerService = inject(TimerService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly projectService = inject(ProjectService);

  readonly isRunning = this.timerService.isRunning;
  readonly elapsed = this.timerService.elapsed;

  readonly runningProjectName = computed(() => {
    const running = this.timeEntryService.runningEntry();
    if (!running) return null;
    return this.projectService.getProject(running.projectId)?.name ?? null;
  });

  readonly navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      exact: true,
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>`,
    },
    {
      path: '/timer',
      label: 'Timer',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
    },
    {
      path: '/projects',
      label: 'Projekte',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
      </svg>`,
    },
    {
      path: '/entries',
      label: 'Zeiteinträge',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>`,
    },
    {
      path: '/reports',
      label: 'Berichte',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>`,
    },
    {
      path: '/settings',
      label: 'Einstellungen',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>`,
    },
  ];
}
