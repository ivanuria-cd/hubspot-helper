/**
 * Scopes de HubSpot declarados por las tools MCP de propiedades y de planificacion. Son INFORMATIVOS
 * (H6 diferido, SPEC-0005 §18): contacts/deals/companies con independencia del objectType. Fuente unica
 * (SPEC-0006 §53.8), antes duplicados en mcp-tools.ts y planning-mcp-tools.ts.
 */
export const SCOPES = [
  'crm.schemas.contacts.read',
  'crm.schemas.deals.read',
  'crm.schemas.companies.read',
];

export const WRITE_SCOPES = [
  'crm.schemas.contacts.write',
  'crm.schemas.deals.write',
  'crm.schemas.companies.write',
];
