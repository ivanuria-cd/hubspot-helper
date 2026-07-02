/**
 * Handlers IPC de proyectos y del archivo portable `.rvproj` (SPEC-0013).
 * Extraído de `index.ts` (SPEC-0002 §23).
 */
import { app, dialog, ipcMain } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { IpcChannels } from '@shared/types/ipc';
import type { NewProjectInput, Project } from '@shared/types/project';
import type {
  ExportProjectInput,
  ImportApplyInput,
  ImportValidateInput,
} from '@shared/types/project-file';
import {
  applyImport,
  buildArchiveEntries,
  buildImportSummary,
  packZip,
  readManifest,
  unpackZip,
} from '../project-file';
import type { SectionRegistry } from '../project-file/section-registry';
import type { ProjectsService } from '../projects';

export interface ProjectsIpcDeps {
  projects: ProjectsService;
  projectFileRegistry: SectionRegistry;
  onActiveProjectChanged: (id: string) => void;
}

export function registerProjectsIpc(deps: ProjectsIpcDeps): void {
  const { projects, projectFileRegistry } = deps;

  ipcMain.handle(IpcChannels.projectsList, () => projects.list());
  ipcMain.handle(IpcChannels.projectsCreate, (_event, input: NewProjectInput) =>
    projects.create(input),
  );
  ipcMain.handle(IpcChannels.projectsUpdate, (_event, project: Project) => projects.update(project));
  ipcMain.handle(IpcChannels.projectsDelete, (_event, id: string) => projects.remove(id));
  ipcMain.handle(IpcChannels.projectsSetActive, (_event, id: string) => {
    deps.onActiveProjectChanged(id);
    return projects.setActive(id);
  });

  ipcMain.handle(IpcChannels.projectsExportDialog, async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'Proyecto RevOps', extensions: ['rvproj'] }],
    });
    return result.canceled || !result.filePath ? null : result.filePath;
  });
  ipcMain.handle(IpcChannels.projectsExport, async (_event, input: ExportProjectInput) => {
    const project = projects.list().find((p) => p.id === input.projectId);
    if (!project) return { success: false, error: 'Proyecto no encontrado.' };
    try {
      const entries = buildArchiveEntries(
        project,
        projectFileRegistry,
        app.getVersion(),
        new Date().toISOString(),
      );
      await writeFile(input.filePath, packZip(entries));
      return { success: true, filePath: input.filePath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al exportar' };
    }
  });
  ipcMain.handle(IpcChannels.projectsImportDialog, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Proyecto RevOps', extensions: ['rvproj'] }],
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  // SPEC-0013 §12: el path llega del renderer; se valida extensión y tamaño antes de leer.
  const MAX_RVPROJ_BYTES = 50 * 1024 * 1024;
  const readProjectFile = async (filePath: string): Promise<Buffer> => {
    if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.rvproj')) {
      throw new Error('El archivo debe tener extensión .rvproj');
    }
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('La ruta no es un archivo');
    if (info.size > MAX_RVPROJ_BYTES) {
      throw new Error('El archivo supera el tamaño máximo permitido (50 MB)');
    }
    return readFile(filePath);
  };
  ipcMain.handle(IpcChannels.projectsImportValidate, async (_event, input: ImportValidateInput) => {
    const buffer = await readProjectFile(input.filePath);
    const entries = unpackZip(buffer);
    const manifest = readManifest(entries);
    return buildImportSummary(
      manifest,
      entries,
      projectFileRegistry,
      projects.list().map((p) => p.id),
    );
  });
  ipcMain.handle(IpcChannels.projectsImportApply, async (_event, input: ImportApplyInput) => {
    const buffer = await readProjectFile(input.filePath);
    const entries = unpackZip(buffer);
    const manifest = readManifest(entries);
    const built = applyImport(manifest, entries, projectFileRegistry, {
      strategy: input.strategy,
      newId: () => randomUUID(),
      now: new Date().toISOString(),
    });
    const saved = projects.upsert(built);
    deps.onActiveProjectChanged(saved.id);
    return saved;
  });
}
