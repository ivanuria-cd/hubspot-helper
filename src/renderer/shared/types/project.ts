/** Modelo de proyecto del shell (SPEC-0002). No contiene credenciales, solo referencias. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lastOpenedAt: string;
  connectors: {
    hubspot?: { portalId: string };
    googleDrive?: { folderId: string };
  };
}

/** Datos aceptados al crear un proyecto desde el diálogo de bienvenida. */
export interface NewProjectInput {
  name: string;
  description?: string;
}
