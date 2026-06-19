import { useState } from 'react';
import {
  Alert,
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
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_AUTONYMS,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shared/i18n/languages';
import { tutorials, tutorialFeatures, resolveContent, resolveTitle } from '../tutorials';
import { MarkdownView } from './MarkdownView';

export function HelpSection(): JSX.Element {
  const { t, i18n } = useTranslation('common');
  const lang: SupportedLanguage = isSupportedLanguage(i18n.language)
    ? i18n.language
    : DEFAULT_LANGUAGE;
  const [selectedId, setSelectedId] = useState<string | null>(tutorials[0]?.id ?? null);
  const selected = tutorials.find((tutorial) => tutorial.id === selectedId) ?? null;
  const features = tutorialFeatures();
  const resolved = selected ? resolveContent(selected, lang) : null;

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
                      <ListItemText primary={resolveTitle(tutorial, lang)} />
                    </ListItemButton>
                  )),
              ])}
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
            {resolved ? (
              <>
                {resolved.isFallback ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('help.fallbackNotice', { language: LANGUAGE_AUTONYMS[lang] })}
                  </Alert>
                ) : null}
                <MarkdownView content={resolved.content} />
              </>
            ) : null}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
