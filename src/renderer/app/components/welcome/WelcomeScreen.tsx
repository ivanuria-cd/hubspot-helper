import { useState } from 'react';
import { Box, Button, Container, List, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { useTranslation } from 'react-i18next';
import { cdPalette } from '@renderer/theme';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import revopsIcon from '@shared/assets/revopshelper-icon.svg';
import type { NewProjectInput, Project } from '@shared/types/project';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';

interface WelcomeScreenProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateProject: (input: NewProjectInput) => void;
  onDeleteProject: (project: Project) => void;
  onExportProject?: (project: Project) => void;
  onImportProject?: () => void;
}

const noop = (): void => undefined;

/** Pantalla de bienvenida: hero oscuro de marca + lista de proyectos sobre fondo claro. */
export function WelcomeScreen({
  projects,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onExportProject = noop,
  onImportProject = noop,
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
          py: { xs: 2.5, md: 3.5 },
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: { xs: 1.5, md: 2 } }}>
            <LanguageSwitcher onDark />
          </Stack>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                component="img"
                src={revopsIcon}
                alt=""
                aria-hidden
                sx={{ height: 56, width: 56, display: 'block' }}
              />
              <Typography variant="h1" component="h1">
                {t('welcome.title')}
              </Typography>
            </Stack>
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
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<FileUploadOutlinedIcon />}
                onClick={onImportProject}
              >
                {t('welcome.importProject')}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                {t('welcome.newProject')}
              </Button>
            </Stack>
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
                  onExport={onExportProject}
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
