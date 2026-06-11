/**
 * Writer del Google Sheets de propiedades. Desacopla la construcción del modelo (puro)
 * del cliente que lo vuelca en Drive, que se inyecta para poder testear sin la Sheets API.
 */
import { buildSheetsModel, type SheetsModel, type SheetsModelInput } from './sheets-model';

export const PROPERTY_MAP_FEATURE_KEY = 'property-management';

export interface SheetsWriteInput {
  folderId: string;
  name: string;
  featureKey: string;
  schemaVersion: number;
  tabs: SheetsModel['tabs'];
}

/** Contrato mínimo que el writer necesita del cliente de Google Sheets. */
export interface SheetsClient {
  writeSpreadsheet(input: SheetsWriteInput): Promise<{ spreadsheetId: string }>;
}

export interface WriteMapInput extends SheetsModelInput {
  folderId: string;
  client: SheetsClient;
}

export async function writePropertyMap(input: WriteMapInput): Promise<{ spreadsheetId: string }> {
  const model = buildSheetsModel(input);
  return input.client.writeSpreadsheet({
    folderId: input.folderId,
    name: 'Mapa de Propiedades',
    featureKey: PROPERTY_MAP_FEATURE_KEY,
    schemaVersion: model.schemaVersion,
    tabs: model.tabs,
  });
}
