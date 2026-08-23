import { Service, computed, inject, signal } from '@angular/core';
import { PROJECT_COLORS, Project, Task } from '../models/models';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';

@Service()
export class ProjectService {
  private readonly storage = inject(StorageService);

  readonly projects = signal<Project[]>([]);
  readonly tasks = signal<Task[]>([]);

  readonly activeProjects = computed(() => this.projects().filter((p) => !p.archived));
  readonly archivedProjects = computed(() => this.projects().filter((p) => p.archived));

  async init(): Promise<void> {
    const [projects, tasks] = await Promise.all([
      this.storage.loadProjects(),
      this.storage.loadTasks(),
    ]);
    this.projects.set(projects);
    this.tasks.set(tasks);
  }

  // --- Projects ---

  async createProject(name: string, description: string, color: string): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim() || undefined,
      color: color || PROJECT_COLORS[0],
      createdAt: new Date().toISOString(),
      archived: false,
    };
    this.projects.update((list) => [...list, project]);
    await this.storage.saveProjects(this.projects());
    return project;
  }

  async updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>): Promise<void> {
    this.projects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    await this.storage.saveProjects(this.projects());
  }

  async archiveProject(id: string): Promise<void> {
    this.projects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, archived: true } : p))
    );
    await this.storage.saveProjects(this.projects());
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.update((list) => list.filter((p) => p.id !== id));
    this.tasks.update((list) => list.filter((t) => t.projectId !== id));
    await Promise.all([
      this.storage.saveProjects(this.projects()),
      this.storage.saveTasks(this.tasks()),
    ]);
  }

  getProject(id: string): Project | undefined {
    return this.projects().find((p) => p.id === id);
  }

  // --- Tasks ---

  tasksForProject(projectId: string): Task[] {
    return this.tasks().filter((t) => t.projectId === projectId && !t.archived);
  }

  async createTask(projectId: string, name: string, category: Task['category'], description?: string): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      projectId,
      name: name.trim(),
      category,
      description: description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    this.tasks.update((list) => [...list, task]);
    await this.storage.saveTasks(this.tasks());
    return task;
  }

  async updateTask(id: string, updates: Partial<Pick<Task, 'name' | 'category' | 'description'>>): Promise<void> {
    this.tasks.update((list) =>
      list.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    await this.storage.saveTasks(this.tasks());
  }

  async archiveTask(id: string): Promise<void> {
    this.tasks.update((list) =>
      list.map((t) => (t.id === id ? { ...t, archived: true } : t))
    );
    await this.storage.saveTasks(this.tasks());
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.update((list) => list.filter((t) => t.id !== id));
    await this.storage.saveTasks(this.tasks());
  }

  getTask(id: string): Task | undefined {
    return this.tasks().find((t) => t.id === id);
  }
}
