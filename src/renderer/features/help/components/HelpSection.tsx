import { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tutorials, tutorialFeatures } from '../tutorials';
import { MarkdownView } from './MarkdownView';

export function HelpSection(): JSX.Element {
  const { t } = useTranslation('common');
  const [selectedId, setSelectedId] = useState<string | null>(tutorials[0]?.id ?? null);
  const selected = tutorials.find((tutorial) => tutorial.id === selectedId) ?? null;
  const features = tutorialFeatures();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('sidebar.help')}
      </Typography>

      {tutorials.length === 0 ? (
        <Typography color="text.primary">{t('help.empty')}</Typography>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            <List dense aria-label={t('help.listLabel')}>
              {features.flatMap((feature) => [
                <ListSubheader key={`subheader-${feature}`} disableSticky>
                  {t(`help.features.${feature}`, { defaultValue: feature })}
                </ListSubheader>,
                ...tutorials
                  .filter((tutorial) => tutorial.feature === feature)
                  .map((tutorial) => (
                    <ListItemButton
                      key={tutorial.id}
                      selected={tutorial.id === selectedId}
                      onClick={() => setSelectedId(tutorial.id)}
                    >
                      <ListItemText primary={tutorial.title} />
                    </ListItemButton>
                  )),
              ])}
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
            {selected ? <MarkdownView content={selected.content} /> : null}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
