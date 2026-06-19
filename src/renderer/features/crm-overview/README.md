# features/crm-overview (SPEC-0011)

Vista general de CRM: índice de la ruta `crm`. Solo lectura. Agrega total + cambios pendientes de Propiedades, Objetos custom y Formularios vía `useCrmOverview` (IPC existente: `entriesList`, `objectsListSchemas`, `formsList`, `formsPendingChanges`, `hubspotGetStatus`). Enlaza a cada feature; avisa si HubSpot no está conectado. No crea endpoints ni lógica de negocio.
