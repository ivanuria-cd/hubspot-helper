# SPEC-0007 — Objetos Custom de HubSpot

**Estado:** BORRADOR
**Branch:** `feat/spec-0007-objetos-custom`
**Fecha:** 2026-06-11
**Depende de:** SPEC-0003, SPEC-0006

---

## 1. Objetivo

Permitir crear y gestionar **objetos personalizados (custom objects)** de HubSpot desde la app, para que la gestión de propiedades (SPEC-0006) pueda definir entradas también sobre ellos. SPEC-0006 solo **selecciona** objetos existentes (estándar y custom ya creados); la **creación** de objetos custom se especifica aquí.

---

## 2. Contexto y decisiones de diseño

- HubSpot expone los objetos custom mediante la **CRM Schemas API v3** (`/crm/v3/schemas`). Verificar en `https://developers.hubspot.com/docs/guides/api/crm/objects/custom-objects` antes de implementar.
- Como en SPEC-0006, la app **nunca crea nada en HubSpot sin confirmación explícita** del usuario, y permite validar primero en **sandbox** antes de **producción**.
- El catálogo de objetos (estándar + custom) que consume SPEC-0006 se obtiene del portal; este SPEC añade la capacidad de **crear** nuevos.

---

## 3. Modelo de datos (provisional)

```typescript
interface CustomObjectDefinition {
  id: string;                 // uuid interno
  name: string;               // nombre singular interno (p.ej. 'machine')
  labels: { singular: string; plural: string };
  primaryDisplayProperty: string;
  requiredProperties: string[];
  properties: HubSpotPropertyDef[];   // propiedades iniciales del objeto
  hubspotObjectTypeId?: string;       // asignado por HubSpot tras crear
  status: 'draft' | 'created';
}
```

---

## 4. Alcance

| Hace | No hace |
|------|---------|
| Crear/leer objetos custom vía CRM Schemas API; catálogo de objetos para SPEC-0006; alta como cambio pendiente revisable (sandbox→producción) | No gestiona registros (instancias) de los objetos; no toca la lógica de entradas de propiedades (eso es SPEC-0006) |

---

## 5. Pendiente de detallar (tras validación)

- IPC (`objects:create`, `objects:list-schemas`), tools MCP, UI de creación, tests y tutoriales.
- Integración exacta con el selector de objetos de SPEC-0006.

---

## 6. Criterios de aceptación (borrador)

- [ ] Se pueden crear objetos custom con sus propiedades iniciales, con confirmación explícita y soporte sandbox→producción.
- [ ] SPEC-0006 puede seleccionar los objetos custom creados.
- [ ] Tests y documentación de usuario.
