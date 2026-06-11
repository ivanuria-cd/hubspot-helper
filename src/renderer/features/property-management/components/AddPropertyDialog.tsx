import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { HsPropertyType, HubSpotProperty } from '@shared/types/properties';

const OBJECT_TYPES = ['contacts', 'deals', 'companies'];
const PROPERTY_TYPES: HsPropertyType[] = [
  'string',
  'number',
  'date',
  'datetime',
  'enumeration',
  'bool',
  'phone_number',
];

interface AddPropertyDialogProps {
  open: boolean;
  property?: HubSpotProperty | null;
  onClose: () => void;
  onSubmit: (input: {
    id?: string;
    hubspotName: string;
    label: string;
    objectType: string;
    type: HsPropertyType;
    fieldType: string;
    groupName: string;
    description?: string;
  }) => Promise<void>;
}

export function AddPropertyDialog({
  open,
  property,
  onClose,
  onSubmit,
}: AddPropertyDialogProps): JSX.Element {
  const { t } = useTranslation('common');
  const [hubspotName, setHubspotName] = useState(property?.hubspotName ?? '');
  const [label, setLabel] = useState(property?.label ?? '');
  const [objectType, setObjectType] = useState(property?.objectType ?? 'contacts');
  const [type, setType] = useState<HsPropertyType>(property?.type ?? 'string');
  const [fieldType, setFieldType] = useState(property?.fieldType ?? 'text');
  const [groupName, setGroupName] = useState(property?.groupName ?? 'contactinformation');
  const [description, setDescription] = useState(property?.description ?? '');

  const isEdit = Boolean(property);
  const canSubmit = hubspotName.trim() && label.trim();

  const handleSubmit = async (): Promise<void> => {
    await onSubmit({
      id: property?.id,
      hubspotName: hubspotName.trim(),
      label: label.trim(),
      objectType,
      type,
      fieldType: fieldType.trim() || 'text',
      groupName: groupName.trim() || 'contactinformation',
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t(isEdit ? 'properties.addDialog.editTitle' : 'properties.addDialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('properties.addDialog.hubspotName')}
            value={hubspotName}
            onChange={(event) => setHubspotName(event.target.value)}
            disabled={isEdit}
            fullWidth
          />
          <TextField
            label={t('properties.addDialog.label')}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label={t('properties.addDialog.object')}
            value={objectType}
            onChange={(event) => setObjectType(event.target.value)}
            disabled={isEdit}
            fullWidth
          >
            {OBJECT_TYPES.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('properties.addDialog.type')}
            value={type}
            onChange={(event) => setType(event.target.value as HsPropertyType)}
            fullWidth
          >
            {PROPERTY_TYPES.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('properties.addDialog.fieldType')}
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value)}
            fullWidth
          />
          <TextField
            label={t('properties.addDialog.group')}
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            fullWidth
          />
          <TextField
            label={t('properties.addDialog.description')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('properties.addDialog.cancel')}</Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>
          {t(isEdit ? 'properties.addDialog.save' : 'properties.addDialog.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
