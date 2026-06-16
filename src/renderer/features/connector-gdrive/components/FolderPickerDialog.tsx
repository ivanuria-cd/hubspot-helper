import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import type { DriveFolder } from '@shared/types/gdrive';

interface Props {
  open: boolean;
  working: boolean;
  listFolders: (parentId: string) => Promise<DriveFolder[]>;
  searchFolders: (query: string) => Promise<DriveFolder[]>;
  onSelect: (folder: { folderId: string; folderName: string; folderPath: string }) => Promise<void>;
  onClose: () => void;
}

/** Raíz virtual del selector y contenedores no seleccionables (§14.10/§14.11). */
const LOCATIONS = 'locations';
const SHARED = 'sharedWithMe';
const SHARED_DRIVES = 'sharedDrives';
const NON_SELECTABLE = new Set([LOCATIONS, SHARED, SHARED_DRIVES]);

export function FolderPickerDialog({
  open,
  working,
  listFolders,
  searchFolders,
  onSelect,
  onClose,
}: Props): JSX.Element {
  const { t } = useTranslation('common');
  const rootNode: DriveFolder = { id: LOCATIONS, name: t('gdrive.folderPicker.locations') };
  const [trail, setTrail] = useState<DriveFolder[]>([rootNode]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const current = trail[trail.length - 1];
  const isSelectable = !searchActive && !NON_SELECTABLE.has(current.id);

  const load = useCallback(
    async (parentId: string) => {
      if (parentId === LOCATIONS) {
        setFolders([
          { id: 'root', name: t('gdrive.folderPicker.myDrive') },
          { id: SHARED, name: t('gdrive.folderPicker.sharedWithMe') },
          { id: SHARED_DRIVES, name: t('gdrive.folderPicker.sharedDrives') },
        ]);
        return;
      }
      setLoading(true);
      try {
        setFolders(await listFolders(parentId));
      } finally {
        setLoading(false);
      }
    },
    [listFolders, t],
  );

  useEffect(() => {
    if (!open) return;
    setTrail([rootNode]);
    setQuery('');
    setSearchActive(false);
    void load(LOCATIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, load]);

  const enter = (folder: DriveFolder): void => {
    const next = [...trail, folder];
    setTrail(next);
    void load(folder.id);
  };

  const goTo = (index: number): void => {
    const next = trail.slice(0, index + 1);
    setTrail(next);
    void load(next[next.length - 1].id);
  };

  const runSearch = async (): Promise<void> => {
    const term = query.trim();
    if (!term) return;
    setSearchActive(true);
    setLoading(true);
    try {
      setFolders(await searchFolders(term));
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = (): void => {
    setQuery('');
    setSearchActive(false);
    void load(current.id);
  };

  /** En modo búsqueda, abrir un resultado lo convierte en la carpeta actual navegable. */
  const openResult = (folder: DriveFolder): void => {
    setQuery('');
    setSearchActive(false);
    setTrail([folder]);
    void load(folder.id);
  };

  const confirm = async (): Promise<void> => {
    await onSelect({
      folderId: current.id,
      folderName: current.name,
      folderPath: trail
        .filter((folder) => folder.id !== LOCATIONS)
        .map((folder) => folder.name)
        .join(' / '),
    });
    onClose();
  };

  const folderIcon = (folder: DriveFolder): JSX.Element =>
    folder.id === SHARED || folder.id === SHARED_DRIVES ? (
      <FolderSharedIcon color="action" />
    ) : (
      <FolderIcon color="action" />
    );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('gdrive.folderPicker.title')}</DialogTitle>
      <DialogContent dividers>
        <TextField
          size="small"
          fullWidth
          value={query}
          placeholder={t('gdrive.folderPicker.searchPlaceholder')}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void runSearch();
          }}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchActive ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label={t('gdrive.folderPicker.clearSearch')} onClick={clearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {!searchActive ? (
          <Breadcrumbs sx={{ mb: 1 }}>
            {trail.map((folder, index) =>
              index === trail.length - 1 ? (
                <Typography key={folder.id} color="text.primary">
                  {folder.name}
                </Typography>
              ) : (
                <Link key={folder.id} component="button" underline="hover" onClick={() => goTo(index)}>
                  {folder.name}
                </Link>
              ),
            )}
          </Breadcrumbs>
        ) : (
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('gdrive.folderPicker.searchResults')}
          </Typography>
        )}

        {loading ? (
          <Typography color="text.primary">{t('gdrive.folderPicker.loading')}</Typography>
        ) : folders.length === 0 ? (
          <Typography color="text.primary">
            {searchActive ? t('gdrive.folderPicker.searchEmpty') : t('gdrive.folderPicker.empty')}
          </Typography>
        ) : (
          <List dense>
            {folders.map((folder) => (
              <ListItemButton
                key={folder.id}
                onClick={() => (searchActive ? openResult(folder) : enter(folder))}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{folderIcon(folder)}</ListItemIcon>
                <ListItemText primary={folder.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={onClose}>
          {t('gdrive.folderPicker.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void confirm()} disabled={working || !isSelectable}>
          {t('gdrive.folderPicker.selectThis')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
