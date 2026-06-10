import { useState } from 'react';
import { Box, Button, Container, List, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { cdPalette } from '@renderer/theme';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import cloudDistrictLogo from '@shared/assets/cloud-district-logo.svg';
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
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box
              component="img"
              src={cloudDistrictLogo}
              alt="Cloud District"
              sx={{ height: 48, display: 'block', mb: { xs: 4, md: 5 } }}
            />
            <LanguageSwitcher onDark />
          </Stack>
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
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ py: 4, fontSize: '1.5rem', fontWeight: 300 }}
            >
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
