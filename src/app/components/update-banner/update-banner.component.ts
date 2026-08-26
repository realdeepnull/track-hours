import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-banner',
  imports: [TranslatePipe],
  template: `
    @if (updateService.installing()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 px-8 py-6 shadow-2xl">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-600 border-t-indigo-600"></div>
          <span class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ 'update.preparingQuit' | translate }}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ 'update.preparingQuitHint' | translate }}</span>
        </div>
      </div>
    } @if (updateService.downloadReady()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800 px-5 py-3 text-slate-900 dark:text-slate-100 shadow-lg shadow-slate-300/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700"
      >
        <span class="text-sm font-medium">{{ 'update.ready' | translate }}</span>
        <button
          (click)="updateService.install()"
          class="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          {{ 'update.restart' | translate }}
        </button>
      </div>
    } @else if (updateService.updateError()) {
      <div
        role="alert"
        aria-live="assertive"
        class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-rose-600 px-5 py-3 text-white shadow-lg shadow-rose-300/50"
      >
        <span class="text-sm font-medium">{{ 'update.error' | translate }}</span>
        <span class="text-xs opacity-75">{{ updateService.updateError() }}</span>
        <button
          type="button"
          (click)="updateService.dismissError()"
          class="rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
          [attr.aria-label]="'update.dismiss' | translate"
        >
          ✕
        </button>
      </div>
    } @else if (updateService.availableVersion()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 px-5 py-3 text-slate-900 dark:text-slate-100 shadow-lg shadow-slate-300/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700"
      >
        <span class="text-sm">{{ 'update.available' | translate : { version: updateService.availableVersion() } }}</span>
        @if (updateService.downloadPercent() !== null) {
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" [attr.aria-valuenow]="updateService.downloadPercent()" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full bg-indigo-500 transition-all duration-300" [style.width.%]="updateService.downloadPercent()"></div>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ updateService.downloadPercent() }}%</span>
        }
      </div>
    }
  `,
})
export class UpdateBannerComponent {
  readonly updateService = inject(UpdateService);
}
