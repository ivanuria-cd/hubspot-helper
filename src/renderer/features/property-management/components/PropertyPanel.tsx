import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type {
  DataOrigin,
  HubSpotProperty,
  PropertyOriginMapping,
} from '@shared/types/properties';
import { StatusBadge } from './StatusBadge';
import { MappingDialog } from './MappingDialog';

interface PropertyPanelProps {
  property: HubSpotProperty | null;
  origins: DataOrigin[];
  mappings: PropertyOriginMapping[];
  onClose: () => void;
  onEdit: (property: HubSpotProperty) => void;
  onUpsertMapping: (mapping: Omit<PropertyOriginMapping, 'id'> & { id?: string }) => Promise<void>;
  onDeleteMapping: (mappingId: string) => Promise<void>;
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Box>
      <Typography variant="caption" color="text.primary">
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export function PropertyPanel({
  property,
  origins,
  mappings,
  onClose,
  onEdit,
  onUpsertMapping,
  onDeleteMapping,
}: PropertyPanelProps): JSX.Element {
  const { t } = useTranslation('common');
  const [mappingOpen, setMappingOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PropertyOriginMapping | null>(null);
  const originName = new Map(origins.map((origin) => [origin.id, origin.name]));
  const propMappings = property
    ? mappings.filter((mapping) => mapping.propertyId === property.id)
    : [];

  return (
    <Drawer anchor="right" open={Boolean(property)} onClose={onClose}>
      <Box sx={{ width: 420, p: 3 }} role="region" aria-label={t('properties.panel.definition')}>
        {property ? (
          <>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {property.hubspotName}
              </Typography>
              <StatusBadge status={property.hubspotStatus} />
              <IconButton aria-label={t('properties.addDialog.editTitle')} onClick={() => onEdit(property)}>
                <EditIcon />
              </IconButton>
              <IconButton aria-label={t('properties.panel.close')} onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              {t('properties.panel.definition')}
            </Typography>
            <Stack spacing={1.5}>
              <Field label={t('properties.panel.label')} value={property.label} />
              <Field label={t('properties.panel.object')} value={property.objectType} />
              <Field label={t('properties.panel.type')} value={property.type} />
              <Field label={t('properties.panel.fieldType')} value={property.fieldType} />
              <Field label={t('properties.panel.group')} value={property.groupName} />
              <Field
                label={t('properties.panel.custom')}
                value={property.isCustom ? 'Sí' : 'No'}
              />
              {property.options?.length ? (
                <Field
                  label={t('properties.panel.options')}
                  value={property.options.map((o) => `${o.label} (${o.value})`).join('; ')}
                />
              ) : null}
              {property.description ? (
                <Field label={t('properties.panel.description')} value={property.description} />
              ) : null}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t('properties.panel.origins')}
              </Typography>
              <Button
                size="small"
                disabled={origins.length === 0}
                onClick={() => {
                  setEditingMapping(null);
                  setMappingOpen(true);
                }}
              >
                {t('properties.panel.addMapping')}
              </Button>
            </Stack>
            {propMappings.length === 0 ? (
              <Typography variant="body2" color="text.primary">
                {t('properties.panel.noMappings')}
              </Typography>
            ) : (
              <List dense disablePadding>
                {propMappings.map((mapping) => (
                  <ListItem
                    key={mapping.id}
                    disableGutters
                    secondaryAction={
                      <>
                        <IconButton
                          size="small"
                          aria-label={t('properties.panel.save')}
                          onClick={() => {
                            setEditingMapping(mapping);
                            setMappingOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={t('properties.panel.delete')}
                          onClick={() => onDeleteMapping(mapping.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    }
                  >
                    <ListItemText
                      primary={originName.get(mapping.originId) ?? mapping.originId}
                      secondary={`${t('properties.panel.sourceField')}: ${mapping.sourceField} · ${
                        mapping.transformations.length
                      } ${t('properties.panel.transformations').toLowerCase()}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              {t('properties.panel.pendingChanges')}
            </Typography>
            {property.pendingChanges?.length ? (
              <Stack spacing={1}>
                {property.pendingChanges.map((change) => (
                  <Chip key={change.id} label={change.summary} variant="outlined" sx={{ height: 'auto', py: 0.5 }} />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.primary">
                {t('properties.panel.noChanges')}
              </Typography>
            )}

            <MappingDialog
              open={mappingOpen}
              propertyId={property.id}
              origins={origins}
              mapping={editingMapping}
              onClose={() => setMappingOpen(false)}
              onSubmit={onUpsertMapping}
            />
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
