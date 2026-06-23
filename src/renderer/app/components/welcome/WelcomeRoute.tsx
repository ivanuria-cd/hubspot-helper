import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NewProjectInput, Project } from '@shared/types/project';
import type { ImportStrategy, ImportSummary } from '@shared/types/project-file';
import { useSnackbar } from '@shared/components/feedback';
import { useProjects } from '@renderer/app/hooks/use-projects';
import { WelcomeScreen } from './WelcomeScreen';
import { ImportProjectDialog } from './ImportProjectDialog';

const COMBINING_MARKS = new RegExp(String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f), 'g');

function defaultFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[' + COMBINING_MARKS.source + ']', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${slug || 'proyecto'}-${today}.rvproj`;
}

/** Contenedor de la pantalla de bienvenida: conecta la UI con el IPC de proyectos (SPEC-0013). */
export function WelcomeRoute(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { notify } = useSnackbar();
  const { projects, create, remove, refresh } = useProjects();
  const [importPath, setImportPath] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const handleCreate = async (input: NewProjectInput): Promise<void> => {
    const project = await create(input);
    navigate(`/project/${project.id}`);
  };

  const handleExport = async (project: Project): Promise<void> => {
    const filePath = await window.api.exportProjectDialog(defaultFileName(project.name));
    if (!filePath) return;
    const result = await window.api.exportProject({ projectId: project.id, filePath });
    notify({
      message: result.success
        ? t('projectFile.exportSuccess', { path: result.filePath })
        : t('projectFile.exportError'),
      severity: result.success ? 'success' : 'error',
    });
  };

  const handleImport = async (): Promise<void> => {
    const filePath = await window.api.importProjectDialog();
    if (!filePath) return;
    try {
      const summary = await window.api.importProjectValidate({ filePath });
      setImportPath(filePath);
      setImportSummary(summary);
    } catch {
      notify({ message: t('projectFile.importError'), severity: 'error' });
    }
  };

  const closeImport = (): void => {
    setImportPath(null);
    setImportSummary(null);
  };

  const handleApplyImport = async (strategy: ImportStrategy): Promise<void> => {
    if (!importPath) return;
    try {
      const project = await window.api.importProjectApply({ filePath: importPath, strategy });
      await refresh();
      closeImport();
      notify({ message: t('projectFile.importSuccess', { name: project.name }), severity: 'success' });
      navigate(`/project/${project.id}`);
    } catch {
      notify({ message: t('projectFile.importError'), severity: 'error' });
    }
  };

  return (
    <>
      <WelcomeScreen
        projects={projects}
        onOpenProject={(project) => navigate(`/project/${project.id}`)}
        onCreateProject={(input) => void handleCreate(input)}
        onDeleteProject={(project) => void remove(project.id)}
        onExportProject={(project) => void handleExport(project)}
        onImportProject={() => void handleImport()}
      />
      <ImportProjectDialog
        open={importPath !== null}
        summary={importSummary}
        onCancel={closeImport}
        onImport={(strategy) => void handleApplyImport(strategy)}
      />
    </>
  );
}
