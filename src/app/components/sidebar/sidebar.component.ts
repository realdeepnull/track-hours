import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TimerService } from '../../services/timer.service';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { DurationPipe } from '../../shared/duration.pipe';
import { IconComponent, IconName } from '../../shared/icon.component';
import { version } from '../../../../package.json';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, DurationPipe, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="flex flex-col h-full bg-indigo-950 text-indigo-100 w-64 min-w-[16rem] select-none"
      aria-label="Hauptnavigation"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-indigo-800">
        <div class="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
          <app-icon name="logo" class="w-5 h-5 text-white" />
        </div>
        <div>
          <div class="font-bold text-base text-white leading-tight">Track Hours</div>
          <div class="text-xs text-indigo-300">{{ 'APP.SUBTITLE' | translate }}</div>
        </div>
      </div>

      <!-- Running timer indicator -->
      @if (isRunning()) {
        <div class="mx-3 mt-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-medium text-emerald-300">{{
              'TIMER.ACTIVE' | translate
            }}</span>
          </div>
          <div class="text-lg font-mono font-bold text-emerald-200 mt-0.5">
            {{ elapsed() | duration }}
          </div>
          @if (runningProjectName()) {
            <div class="text-xs text-emerald-300/70 truncate mt-0.5">
              {{ runningProjectName() }}
            </div>
          }
        </div>
      }

      <!-- Nav items -->
      <ul class="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="list">
        @for (item of navItems; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-indigo-700 text-white"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            >
              <span class="w-5 h-5 shrink-0">
                <app-icon [name]="item.icon" />
              </span>
              {{ item.label | translate }}
            </a>
          </li>
        }
      </ul>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-indigo-800 text-xs text-indigo-500">
        Track Hours v{{ appVersion }}
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

  readonly appVersion = version;

  readonly navItems: { path: string; label: string; exact?: boolean; icon: IconName }[] = [
    { path: '/dashboard', label: 'NAV.DASHBOARD', exact: true, icon: 'dashboard' },
    { path: '/timer', label: 'NAV.TIMER', icon: 'timer' },
    { path: '/projects', label: 'NAV.PROJECTS', icon: 'projects' },
    { path: '/entries', label: 'NAV.ENTRIES', icon: 'entries' },
    { path: '/reports', label: 'NAV.REPORTS', icon: 'reports' },
    { path: '/settings', label: 'NAV.SETTINGS', icon: 'settings' },
  ];
}
