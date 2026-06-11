import {
  Box,
  Chip,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DataOrigin, HubSpotProperty, PropertyOriginMapping } from '@shared/types/properties';
import { StatusBadge } from './StatusBadge';

interface PropertiesTableProps {
  properties: HubSpotProperty[];
  origins: DataOrigin[];
  mappings: PropertyOriginMapping[];
  onSelect: (property: HubSpotProperty) => void;
  onViewChanges: (property: HubSpotProperty) => void;
}

export function PropertiesTable({
  properties,
  origins,
  mappings,
  onSelect,
  onViewChanges,
}: PropertiesTableProps): JSX.Element {
  const { t } = useTranslation('common');
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));

  if (properties.length === 0) {
    return <Typography color="text.primary">{t('properties.noResults')}</Typography>;
  }

  return (
    <List aria-label={t('properties.title')} disablePadding>
      {properties.map((property) => {
        const propOrigins = mappings
          .filter((mapping) => mapping.propertyId === property.id)
          .map((mapping) => originName.get(mapping.originId) ?? mapping.originId);
        const changeCount = property.pendingChanges?.length ?? 0;
        return (
          <ListItemButton
            key={property.id}
            onClick={() => onSelect(property)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'block', py: 1.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
              <Typography sx={{ fontWeight: 600, minWidth: 200 }}>{property.hubspotName}</Typography>
              <Typography color="text.primary" sx={{ minWidth: 90 }}>
                {property.objectType}
              </Typography>
              <Typography color="text.primary" sx={{ minWidth: 110 }}>
                {property.type}
              </Typography>
              <StatusBadge status={property.hubspotStatus} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
              <Typography variant="body2" color="text.primary">
                {t('properties.originsLabel')}
              </Typography>
              {propOrigins.length > 0 ? (
                propOrigins.map((name) => <Chip key={name} size="small" label={name} variant="outlined" />)
              ) : (
                <Typography variant="body2" color="text.primary">
                  {t('properties.noOrigins')}
                </Typography>
              )}
              <Box sx={{ flexGrow: 1 }} />
              {property.hubspotStatus === 'divergent' && changeCount > 0 ? (
                <Chip
                  size="small"
                  clickable
                  label={t('properties.viewChanges')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewChanges(property);
                  }}
                />
              ) : null}
              {property.hubspotStatus === 'missing' && changeCount > 0 ? (
                <Chip
                  size="small"
                  clickable
                  label={t('properties.applyInHs')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewChanges(property);
                  }}
                />
              ) : null}
            </Stack>
          </ListItemButton>
        );
      })}
    </List>
  );
}
