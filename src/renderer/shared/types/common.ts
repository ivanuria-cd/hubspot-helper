/**
 * Tipo de resultado de operación común (SPEC-0002 §35): éxito + mensaje de error opcional.
 * Fuente única de la que derivan los alias nominales por dominio (HubSpot, Drive, MCP, formularios…).
 */
export interface OperationResult {
  success: boolean;
  error?: string;
}
