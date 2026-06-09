import { useCallback, useEffect, useState } from 'react';
import type { NewProjectInput, Project } from '@shared/types/project';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: NewProjectInput) => Promise<Project>;
  remove: (id: string) => Promise<void>;
}

/** Carga y muta la lista de proyectos a través del proceso main (IPC). */
export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await window.api.listProjects();
    setProjects([...list].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: NewProjectInput) => {
      const project = await window.api.createProject(input);
      await refresh();
      return project;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await window.api.deleteProject(id);
      await refresh();
    },
    [refresh],
  );

  return { projects, loading, refresh, create, remove };
}
