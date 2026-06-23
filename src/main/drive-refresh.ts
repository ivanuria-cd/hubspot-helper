/**
 * Orquestador puro de la revisión y actualización de los documentos de Drive al abrir el proyecto
 * (SPEC-0004 §19). No depende de Electron: recibe descriptores de característica con sus closures de
 * datos/staleness/escritura, para poder testearlo.
 */
import type { GoogleDriveRefreshItem, GoogleDriveRefreshResult } from '@shared/types/gdrive';

export interface RefreshFeature {
  featureKey: string;
  name: string;
  hasData: () => boolean;
  isStale: () => boolean;
  write: () => Promise<{ success: boolean; error?: string }>;
}

export async function refreshDrive(
  connected: boolean,
  features: RefreshFeature[],
): Promise<GoogleDriveRefreshResult> {
  if (!connected) return { connected: false, upToDate: true, items: [] };

  const items: GoogleDriveRefreshItem[] = [];
  for (const feature of features) {
    if (!feature.hasData() || !feature.isStale()) continue;
    const result = await feature.write();
    items.push(
      result.success
        ? { featureKey: feature.featureKey, name: feature.name, status: 'updated' }
        : { featureKey: feature.featureKey, name: feature.name, status: 'error', error: result.error },
    );
  }
  return { connected: true, upToDate: items.length === 0, items };
}
