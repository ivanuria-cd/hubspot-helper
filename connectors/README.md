# connectors

Clientes de integración que se ejecutan en el **proceso principal** de Electron. Nunca exponen secrets al renderer; la comunicación con la UI pasa por IPC controlado.

- `hubspot/` — cliente HubSpot (SPEC-0003).
- `google-drive/` — cliente Google Drive (SPEC-0004).
