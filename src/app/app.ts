import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { UpdateBannerComponent } from './components/update-banner/update-banner.component';
import { ProjectService } from './services/project.service';
import { StorageService } from './services/storage.service';
import { TimeEntryService } from './services/time-entry.service';
import { TimerService } from './services/timer.service';
import { UpdateService } from './services/update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, UpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly storageService = inject(StorageService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly timerService = inject(TimerService);
  private readonly translateService = inject(TranslateService);
  private readonly updateService = inject(UpdateService);

  async ngOnInit(): Promise<void> {
    const [settings] = await Promise.all([
      this.storageService.loadSettings(),
      this.projectService.init(),
      this.timeEntryService.init(),
    ]);
    this.translateService.use(settings.language ?? 'de');
    if (settings.reminderEnabled) {
      this.timerService.setupReminders(settings.reminderIntervalMinutes);
    }
    this.updateService.init();
  }
}
