import { useNavigate } from 'react-router-dom';
import type { NewProjectInput, Project } from '@shared/types/project';
import { useProjects } from '@renderer/app/hooks/use-projects';
import { WelcomeScreen } from './WelcomeScreen';

/** Contenedor de la pantalla de bienvenida: conecta la UI con el IPC de proyectos. */
export function WelcomeRoute(): JSX.Element {
  const navigate = useNavigate();
  const { projects, create, remove } = useProjects();

  const handleCreate = async (input: NewProjectInput): Promise<void> => {
    const project = await create(input);
    navigate(`/project/${project.id}`);
  };

  const handleOpen = (project: Project): void => {
    navigate(`/project/${project.id}`);
  };

  return (
    <WelcomeScreen
      projects={projects}
      onOpenProject={handleOpen}
      onCreateProject={(input) => void handleCreate(input)}
      onDeleteProject={(project) => void remove(project.id)}
    />
  );
}
