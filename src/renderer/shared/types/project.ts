import type { ProjectFileSection } from '@shared/types/project-file';

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
  /**
   * Secciones de un `.rvproj` importado que esta versión no sabe aplicar
   * (featureKey desconocida o schema_version más nueva). Se preservan para el
   * round-trip al reexportar (SPEC-0013 §2.4).
   */
  portableSections?: ProjectFileSection[];
}

/** Datos aceptados al crear un proyecto desde el diálogo de bienvenida. */
export interface NewProjectInput {
  name: string;
  description?: string;
}
