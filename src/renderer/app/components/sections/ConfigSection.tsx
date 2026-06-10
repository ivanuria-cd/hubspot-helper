import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Configuración del proyecto. Punto de entrada a los conectores (HubSpot, etc.). */
export function ConfigSection(): JSX.Element {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('sidebar.config')}
      </Typography>
      <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
        {t('connectors.title')}
      </Typography>
      <List sx={{ maxWidth: 560 }}>
        <ListItem disablePadding divider>
          <ListItemButton
            onClick={() => navigate('connectors/hubspot')}
            aria-label={t('connectors.hubspot')}
          >
            <ListItemIcon>
              <HubIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('connectors.hubspot')}
              secondary={t('connectors.hubspotDescription')}
              secondaryTypographyProps={{ color: 'text.primary' }}
            />
            <ChevronRightIcon aria-hidden />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
}
