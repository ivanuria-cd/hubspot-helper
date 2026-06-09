import { useState } from 'react';
import { Box, Button, Container, List, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { cdPalette } from '@renderer/theme';
<<<<<<< HEAD
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
=======
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
import type { NewProjectInput, Project } from '@shared/types/project';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';

interface WelcomeScreenProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateProject: (input: NewProjectInput) => void;
  onDeleteProject: (project: Project) => void;
}

/** Pantalla de bienvenida: hero oscuro de marca + lista de proyectos sobre fondo claro. */
export function WelcomeScreen({
  projects,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
}: WelcomeScreenProps): JSX.Element {
  const { t } = useTranslation('common');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (input: NewProjectInput): void => {
    onCreateProject(input);
    setDialogOpen(false);
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="section"
        sx={{
          backgroundColor: cdPalette.bgDark,
          color: cdPalette.textOnDark,
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="md">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box>
              <Typography variant="h1" component="h1">
                {t('welcome.title')}
              </Typography>
              <Typography
                variant="h5"
                component="p"
                sx={{
                  mt: 2,
                  fontFamily: '"Libre Baskerville", serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: cdPalette.secondary,
                }}
              >
                {t('welcome.subtitle')}
              </Typography>
            </Box>
<<<<<<< HEAD
            <Stack spacing={2} alignItems="flex-end">
              <LanguageSwitcher onDark />
              <Typography
                component="span"
                aria-label="Cloud District"
                sx={{ fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.9 }}
              >
                Cloud District
              </Typography>
            </Stack>
=======
            <Typography
              component="span"
              aria-label="Cloud District"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.9 }}
            >
              Cloud District
            </Typography>
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
          </Stack>
        </Container>
      </Box>

      <Box
        component="section"
        sx={{ backgroundColor: cdPalette.bgLight, flexGrow: 1, py: { xs: 4, md: 6 } }}
      >
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" component="h2">
              {t('welcome.recentProjects')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              {t('welcome.newProject')}
            </Button>
          </Stack>

          {projects.length > 0 ? (
            <List disablePadding aria-label={t('welcome.recentProjects')}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onOpen={onOpenProject}
                  onDelete={onDeleteProject}
                />
              ))}
            </List>
          ) : (
<<<<<<< HEAD
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ py: 4, fontSize: '1.5rem', fontWeight: 300 }}
            >
=======
            <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
>>>>>>> 17940ea55cdc1fa46bc12fdc89972681cd549711
              {t('welcome.emptyState')}
            </Typography>
          )}
        </Container>
      </Box>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </Box>
  );
}
