# shared

Componentes, hooks, utilidades y tipos compartidos entre features del renderer.

- `types/` — contratos compartidos (p. ej. `ipc.ts`, el contrato IPC público con el proceso main).

Regla (SPEC-0000): las features no se importan entre sí; lo común vive aquí.
