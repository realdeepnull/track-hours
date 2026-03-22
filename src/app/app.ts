import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ProjectService } from './services/project.service';
import { TimeEntryService } from './services/time-entry.service';
import { TimerService } from './services/timer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly timerService = inject(TimerService);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.projectService.init(),
      this.timeEntryService.init(),
    ]);
  }
}
