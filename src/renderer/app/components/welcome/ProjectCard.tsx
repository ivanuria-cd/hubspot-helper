import { Box, Chip, IconButton, ListItem, ListItemButton, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import type { Project } from '@shared/types/project';

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
  onDelete: (project: Project) => void;
  onExport: (project: Project) => void;
}

/** Ítem de la lista de proyectos con badge lima (Deep Navy sobre #AFFC41). */
export function ProjectCard({
  project,
  index,
  onOpen,
  onDelete,
  onExport,
}: ProjectCardProps): JSX.Element {
  const { t } = useTranslation('common');
  const badge = String(index + 1).padStart(2, '0');

  return (
    <ListItem
      disablePadding
      divider
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          <IconButton
            aria-label={t('welcome.exportProject', { name: project.name })}
            onClick={() => onExport(project)}
          >
            <FileDownloadOutlinedIcon />
          </IconButton>
          <IconButton
            edge="end"
            aria-label={t('welcome.deleteProject', { name: project.name })}
            onClick={() => onDelete(project)}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      }
    >
      <ListItemButton
        onClick={() => onOpen(project)}
        aria-label={t('welcome.openProject', { name: project.name })}
      >
        <Chip label={badge} color="secondary" size="small" sx={{ mr: 2, fontWeight: 600 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" component="span" noWrap>
            {project.name}
          </Typography>
          {project.description ? (
            <Typography variant="body2" color="text.primary" noWrap>
              {project.description}
            </Typography>
          ) : null}
        </Box>
        <ChevronRightIcon aria-hidden />
      </ListItemButton>
    </ListItem>
  );
}
