/** Handlers IPC del conector Google Drive (SPEC-0004). Extraído de `index.ts` (SPEC-0002 §23). */
import { ipcMain } from 'electron';
import { IpcChannels } from '@shared/types/ipc';
import type {
  GoogleCredentialsInput,
  GoogleDriveListFoldersInput,
  GoogleDriveProjectInput,
  GoogleDriveReadFileInput,
  GoogleDriveSearchFoldersInput,
  GoogleDriveSetFolderInput,
  GoogleDriveWriteFileInput,
} from '@shared/types/gdrive';
import type { GoogleDriveConnector } from '../connectors/google-drive';
import { refreshDrive } from '../drive-refresh';
import type { DriveDocs } from '../drive-docs';

export interface GdriveIpcDeps {
  gdrive: GoogleDriveConnector;
  driveDocs: DriveDocs;
}

export function registerGdriveIpc(deps: GdriveIpcDeps): void {
  const { gdrive, driveDocs } = deps;

  ipcMain.handle(IpcChannels.gdriveStartAuth, (event, input: GoogleDriveProjectInput) =>
    gdrive.startAuth(input.projectId, (status) =>
      event.sender.send(IpcChannels.gdriveAuthStatus, status),
    ),
  );
  ipcMain.handle(IpcChannels.gdriveListFolders, (_event, input: GoogleDriveListFoldersInput) =>
    gdrive.listFolders(input.projectId, input.parentId),
  );
  ipcMain.handle(IpcChannels.gdriveSearchFolders, (_event, input: GoogleDriveSearchFoldersInput) =>
    gdrive.searchFolders(input.projectId, input.query),
  );
  ipcMain.handle(IpcChannels.gdriveSetFolder, (_event, input: GoogleDriveSetFolderInput) =>
    gdrive.setFolder(input.projectId, {
      folderId: input.folderId,
      folderName: input.folderName,
      folderPath: input.folderPath,
    }),
  );
  ipcMain.handle(IpcChannels.gdriveGetStatus, (_event, input: GoogleDriveProjectInput) =>
    gdrive.getStatus(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveSync, (_event, input: GoogleDriveProjectInput) =>
    gdrive.sync(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveRevoke, (_event, input: GoogleDriveProjectInput) =>
    gdrive.revoke(input.projectId),
  );
  ipcMain.handle(IpcChannels.gdriveWriteFile, (_event, input: GoogleDriveWriteFileInput) =>
    gdrive.writeFile(input),
  );
  ipcMain.handle(IpcChannels.gdriveReadFile, (_event, input: GoogleDriveReadFileInput) =>
    gdrive.readFile(input),
  );
  ipcMain.handle(IpcChannels.gdriveGetCredentials, () => gdrive.getCredentialsStatus());
  ipcMain.handle(IpcChannels.gdriveSetCredentials, (_event, input: GoogleCredentialsInput) =>
    gdrive.setCredentials(input),
  );
  ipcMain.handle(IpcChannels.gdriveClearCredentials, () => gdrive.clearCredentials());
  ipcMain.handle(IpcChannels.gdriveRefreshProject, (_event, input: GoogleDriveProjectInput) => {
    const config = gdrive.getStatus(input.projectId);
    const connected = Boolean(config?.folderId && config?.accountEmail);
    return refreshDrive(connected, driveDocs.buildRefreshFeatures(input.projectId));
  });
}
