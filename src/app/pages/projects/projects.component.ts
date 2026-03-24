import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ProjectService } from '../../services/project.service';
import { IconComponent } from '../../shared/icon.component';
import { PROJECT_COLORS, Task, TASK_CATEGORIES } from '../../models/models';

type DialogMode = 'project' | 'task' | null;

@Component({
  selector: 'app-projects',
  imports: [FormsModule, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-100">{{ 'PROJECTS.TITLE' | translate }}</h1>
        <button (click)="openProjectDialog()"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
          <span aria-hidden="true">+</span> {{ 'PROJECTS.NEW_PROJECT' | translate }}
        </button>
      </div>

      <!-- Project list -->
      @if (projects().length === 0) {
        <div class="text-center py-20 text-slate-500">
          <p class="text-lg">{{ 'PROJECTS.NO_PROJECTS' | translate }}</p>
          <p class="text-sm mt-1">{{ 'PROJECTS.NO_PROJECTS_HINT' | translate }}</p>
        </div>
      }

      <div class="space-y-4">
        @for (project of projects(); track project.id) {
          <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <!-- Project header -->
            <div class="flex items-center gap-4 px-5 py-4">
              <div class="w-4 h-4 rounded-full shrink-0" [style.background-color]="project.color"></div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-slate-100">{{ project.name }}</div>
                @if (project.description) {
                  <div class="text-xs text-slate-400 mt-0.5">{{ project.description }}</div>
                }
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-slate-500">{{ 'PROJECTS.TASK_COUNT' | translate: { count: taskCount(project.id) } }}</span>
                <button (click)="openTaskDialog(project.id)"
                  class="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
                  {{ 'PROJECTS.ADD_TASK' | translate }}
                </button>
                <button (click)="openEditProjectDialog(project)"
                  class="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                  [attr.aria-label]="'PROJECTS.EDIT_PROJECT_LABEL' | translate">
                  <app-icon name="edit" class="w-4 h-4" />
                </button>
                @if (confirmDeleteProjectId() === project.id) {
                  <span class="text-xs text-rose-400">{{ 'PROJECTS.CONFIRM_DELETE' | translate }}</span>
                  <button (click)="archiveProject(project.id)"
                    class="px-2 py-1 rounded text-xs bg-rose-600 hover:bg-rose-500 text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                    [attr.aria-label]="'COMMON.CONFIRM' | translate">
                    {{ 'COMMON.YES' | translate }}
                  </button>
                  <button (click)="confirmDeleteProjectId.set(null)"
                    class="px-2 py-1 rounded text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                    [attr.aria-label]="'COMMON.CANCEL' | translate">
                    {{ 'COMMON.NO' | translate }}
                  </button>
                } @else {
                  <button (click)="confirmDeleteProjectId.set(project.id)"
                    class="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                    [attr.aria-label]="'PROJECTS.DELETE_PROJECT_LABEL' | translate">
                    <app-icon name="trash" class="w-4 h-4" />
                  </button>
                }
              </div>
            </div>

            <!-- Task list -->
            @if (taskCount(project.id) > 0) {
              <ul class="border-t border-slate-700 divide-y divide-slate-700/50" role="list">
                @for (task of projectTasks(project.id); track task.id) {
                  <li class="flex items-center gap-3 px-5 py-2.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      [style.background-color]="getCategoryColor(task.category) + '20'"
                      [style.color]="getCategoryColor(task.category)">
                      {{ getCategoryLabel(task.category) }}
                    </span>
                    <span class="flex-1 text-sm text-slate-300">{{ task.name }}</span>
                    @if (task.description) {
                      <span class="text-xs text-slate-500 truncate max-w-xs">{{ task.description }}</span>
                    }
                    <button (click)="archiveTask(task.id)"
                      class="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                      [attr.aria-label]="'PROJECTS.DELETE_TASK_LABEL' | translate">
                      <app-icon name="close" class="w-3.5 h-3.5" />
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </div>

    <!-- Project Dialog -->
    @if (dialogMode() === 'project') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog" aria-modal="true" [attr.aria-label]="(editingProjectId() ? 'PROJECTS.EDIT_PROJECT' : 'PROJECTS.NEW_PROJECT') | translate">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-semibold text-slate-100">{{ (editingProjectId() ? 'PROJECTS.EDIT_PROJECT' : 'PROJECTS.NEW_PROJECT') | translate }}</h2>

          <div class="space-y-1.5">
            <label for="proj-name" class="text-sm text-slate-300">{{ 'PROJECTS.NAME' | translate }} *</label>
            <input id="proj-name" [ngModel]="formName()" (ngModelChange)="formName.set($event)" type="text" [placeholder]="'PROJECTS.NAME_PLACEHOLDER' | translate"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>

          <div class="space-y-1.5">
            <label for="proj-desc" class="text-sm text-slate-300">{{ 'PROJECTS.DESCRIPTION' | translate }}</label>
            <textarea id="proj-desc" [ngModel]="formDescription()" (ngModelChange)="formDescription.set($event)" rows="2" [placeholder]="'ENTRIES.OPTIONAL' | translate"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <div class="space-y-1.5">
            <span class="text-sm text-slate-300">{{ 'PROJECTS.COLOR' | translate }}</span>
            <div class="flex flex-wrap gap-2">
              @for (color of projectColors; track color) {
                <button (click)="formColor.set(color)"
                  class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  [style.background-color]="color"
                  [class]="formColor() === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''"
                  [attr.aria-label]="'Farbe ' + color"
                  [attr.aria-pressed]="formColor() === color">
                </button>
              }
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="saveProject()" [disabled]="!formName().trim()"
              class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
              {{ 'COMMON.SAVE' | translate }}
            </button>
            <button (click)="closeDialog()"
              class="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Task Dialog -->
    @if (dialogMode() === 'task') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog" aria-modal="true" [attr.aria-label]="'PROJECTS.NEW_TASK' | translate">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-semibold text-slate-100">{{ 'PROJECTS.NEW_TASK' | translate }}</h2>

          <div class="space-y-1.5">
            <label for="task-name" class="text-sm text-slate-300">{{ 'PROJECTS.NAME' | translate }} *</label>
            <input id="task-name" [ngModel]="formName()" (ngModelChange)="formName.set($event)" type="text" [placeholder]="'PROJECTS.TASK_NAME' | translate"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>

          <div class="space-y-1.5">
            <label for="task-cat" class="text-sm text-slate-300">{{ 'PROJECTS.TASK_CATEGORY' | translate }}</label>
            <select id="task-cat" [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              @for (cat of categories; track cat.value) {
                <option [value]="cat.value">{{ cat.label }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="task-desc" class="text-sm text-slate-300">{{ 'PROJECTS.DESCRIPTION' | translate }}</label>
            <input id="task-desc" [ngModel]="formDescription()" (ngModelChange)="formDescription.set($event)" type="text" [placeholder]="'ENTRIES.OPTIONAL' | translate"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="saveTask()" [disabled]="!formName().trim()"
              class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
              {{ 'COMMON.SAVE' | translate }}
            </button>
            <button (click)="closeDialog()"
              class="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProjectsComponent {
  private readonly projectService = inject(ProjectService);

  readonly projects = this.projectService.activeProjects;
  readonly categories = TASK_CATEGORIES;
  readonly projectColors = PROJECT_COLORS;

  // Dialog state
  dialogMode = signal<DialogMode>(null);
  editingProjectId = signal<string | null>(null);
  taskDialogProjectId = signal<string>('');
  confirmDeleteProjectId = signal<string | null>(null);

  // Form state
  formName = signal('');
  formDescription = signal('');
  formColor = signal(PROJECT_COLORS[0]);
  formCategory = signal<Task['category']>('development');

  openProjectDialog(): void {
    this.editingProjectId.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.formColor.set(PROJECT_COLORS[0]);
    this.dialogMode.set('project');
  }

  openEditProjectDialog(project: { id: string; name: string; description?: string; color: string }): void {
    this.editingProjectId.set(project.id);
    this.formName.set(project.name);
    this.formDescription.set(project.description ?? '');
    this.formColor.set(project.color);
    this.dialogMode.set('project');
  }

  openTaskDialog(projectId: string): void {
    this.taskDialogProjectId.set(projectId);
    this.formName.set('');
    this.formDescription.set('');
    this.formCategory.set('development');
    this.dialogMode.set('task');
  }

  closeDialog(): void {
    this.dialogMode.set(null);
  }

  async saveProject(): Promise<void> {
    if (!this.formName().trim()) return;
    const id = this.editingProjectId();
    if (id) {
      await this.projectService.updateProject(id, {
        name: this.formName(),
        description: this.formDescription(),
        color: this.formColor(),
      });
    } else {
      await this.projectService.createProject(this.formName(), this.formDescription(), this.formColor());
    }
    this.closeDialog();
  }

  async saveTask(): Promise<void> {
    if (!this.formName().trim()) return;
    await this.projectService.createTask(
      this.taskDialogProjectId(),
      this.formName(),
      this.formCategory(),
      this.formDescription()
    );
    this.closeDialog();
  }

  async deleteProject(id: string): Promise<void> {
    this.confirmDeleteProjectId.set(null);
    await this.projectService.deleteProject(id);
  }

  async archiveProject(id: string): Promise<void> {
    this.confirmDeleteProjectId.set(null);
    await this.projectService.archiveProject(id);
  }

  async deleteTask(id: string): Promise<void> {
    await this.projectService.deleteTask(id);
  }

  async archiveTask(id: string): Promise<void> {
    await this.projectService.archiveTask(id);
  }

  taskCount(projectId: string): number {
    return this.projectService.tasksForProject(projectId).length;
  }

  projectTasks(projectId: string): Task[] {
    return this.projectService.tasksForProject(projectId);
  }

  getCategoryLabel(cat: Task['category']): string {
    return TASK_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  }

  getCategoryColor(cat: Task['category']): string {
    return TASK_CATEGORIES.find((c) => c.value === cat)?.color ?? '#6b7280';
  }
}
