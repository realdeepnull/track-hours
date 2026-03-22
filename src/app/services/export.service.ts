import { Injectable, inject } from '@angular/core';
import { TimeEntry, Project, Task, TASK_CATEGORIES } from '../models/models';
import { StorageService } from './storage.service';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly storage = inject(StorageService);

  async exportCSV(
    entries: TimeEntry[],
    projects: Project[],
    tasks: Task[],
    filename?: string
  ): Promise<void> {
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const header = ['Datum', 'Startzeit', 'Endzeit', 'Dauer (h)', 'Projekt', 'Aufgabe', 'Kategorie', 'Notiz'];
    const rows = entries
      .filter((e) => e.endTime)
      .map((e) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime!);
        const project = projectMap.get(e.projectId);
        const task = taskMap.get(e.taskId);
        const category = TASK_CATEGORIES.find((c) => c.value === task?.category);
        return [
          format(start, 'dd.MM.yyyy', { locale: de }),
          format(start, 'HH:mm:ss'),
          format(end, 'HH:mm:ss'),
          (e.durationSeconds / 3600).toFixed(2),
          project?.name ?? '',
          task?.name ?? '',
          category?.label ?? '',
          e.note ?? '',
        ];
      });

    const csvContent =
      [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    await this.storage.exportSave(filename ?? 'zeiterfassung.csv', bom + csvContent);
  }

  async exportPDF(
    entries: TimeEntry[],
    projects: Project[],
    tasks: Task[],
    title: string,
    filename?: string
  ): Promise<void> {
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setTextColor(30, 27, 75);
    doc.text('Track Hours – Zeiterfassung', 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(title, 14, 26);
    doc.text(`Erstellt: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 14, 32);

    const tableRows = entries
      .filter((e) => e.endTime)
      .map((e) => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime!);
        const project = projectMap.get(e.projectId);
        const task = taskMap.get(e.taskId);
        const category = TASK_CATEGORIES.find((c) => c.value === task?.category);
        const hours = Math.floor(e.durationSeconds / 3600);
        const mins = Math.floor((e.durationSeconds % 3600) / 60);
        return [
          format(start, 'dd.MM.yyyy', { locale: de }),
          format(start, 'HH:mm') + ' – ' + format(end, 'HH:mm'),
          `${hours}h ${mins}m`,
          project?.name ?? '',
          task?.name ?? '',
          category?.label ?? '',
          e.note ?? '',
        ];
      });

    const totalSecs = entries.filter((e) => e.endTime).reduce((s, e) => s + e.durationSeconds, 0);
    const totalH = Math.floor(totalSecs / 3600);
    const totalM = Math.floor((totalSecs % 3600) / 60);

    autoTable(doc, {
      startY: 38,
      head: [['Datum', 'Zeitraum', 'Dauer', 'Projekt', 'Aufgabe', 'Kategorie', 'Notiz']],
      body: tableRows,
      foot: [['', 'Gesamt:', `${totalH}h ${totalM}m`, '', '', '', '']],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 27, 75], textColor: 255 },
      footStyles: { fillColor: [240, 240, 250], textColor: [30, 27, 75], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    });

    const pdfBytes = doc.output('arraybuffer');
    await this.storage.exportSave(filename ?? 'zeiterfassung.pdf', new Uint8Array(pdfBytes));
  }
}
