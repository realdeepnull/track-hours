import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-banner',
  imports: [TranslatePipe],
  template: `
    @if (updateService.downloadReady()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-indigo-600 px-5 py-3 text-white shadow-lg"
      >
        <span class="text-sm font-medium">{{ 'update.ready' | translate }}</span>
        <button
          (click)="updateService.install()"
          class="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {{ 'update.restart' | translate }}
        </button>
      </div>
    } @else if (updateService.updateError()) {
      <div
        role="alert"
        aria-live="assertive"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-red-700 px-5 py-3 text-white shadow-lg"
      >
        <span class="text-sm font-medium">{{ 'update.error' | translate }}</span>
      </div>
    } @else if (updateService.availableVersion()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-xl bg-slate-700 px-5 py-3 text-white shadow-lg"
      >
        <span class="text-sm">{{ 'update.available' | translate : { version: updateService.availableVersion() } }}</span>
        @if (updateService.downloadPercent() !== null) {
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-500" role="progressbar" [attr.aria-valuenow]="updateService.downloadPercent()" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full bg-indigo-400 transition-all duration-300" [style.width.%]="updateService.downloadPercent()"></div>
          </div>
          <span class="text-xs text-slate-400">{{ updateService.downloadPercent() }}%</span>
        }
      </div>
    }
  `,
})
export class UpdateBannerComponent {
  readonly updateService = inject(UpdateService);
}
