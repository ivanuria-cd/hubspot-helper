# Informe de pruebas del MCP RevOps — Proyecto «Testing»

- **Fecha:** 2026-06-18
- **Proyecto activo (projectId):** `115e5407-93a0-43e0-b175-6a18d4e3291d`
- **Servidor MCP:** `revops`
- **Alcance acordado:** lectura + escritura local (drafts) + apply/sync reales en HubSpot.
- **Resultado global:** 24 herramientas con comportamiento correcto, 1 fallo de uso reproducible (`forms_create_definition` con `fieldGroups`), 1 fallo esperado por precondición (`forms_add_missing_fields` sin formulario sincronizado) y 2 herramientas no ejecutadas por decisión de seguridad (`custom_objects_apply_change` / `custom_objects_discard_change`).

## Tercera batería (2026-06-24) — tools nuevas y revalidación

Tras los fixes y un reinicio de la app, el servidor MCP expone 8 tools nuevas. Resultado:

- **Fixes previos revalidados en vivo:** `forms_create_definition` (acepta `fieldGroups`, conserva `name`), `entries_upsert` (rechaza `originId` inexistente), `custom_objects_sync`/`delete_draft`, `origins_delete`, `forms_discard_change`.
- **Grupos (ciclo completo):** `properties_groups_request_delete` → `properties_group_pending_changes` → `properties_groups_discard_change` (cancela) y `properties_groups_apply_change` (destructivo, sandbox) sobre un grupo desechable. La precondición «grupo vacío» se respeta. ✅
- **`properties_request_delete`:** genera el cambio `delete` (archivado) tras `properties_sync`; aplicado a sandbox archivó la propiedad residuo `zzz_mcp_test`. ✅
- **Formularios:** `forms_update_definition` (cambio `update_form` conservando campos/config) y `forms_edit_pending_change` (edita el pendiente) ✅; descartados sin aplicar a HubSpot.
- **`forms_subscription_types`:** ❌ **403** — el PAT no tiene scope de Communication Preferences API (limitación de permisos, no de código).
- **Entorno activo detectado:** sandbox (el apply de grupo a production dio `GROUP_NOT_FOUND`).
- **Residuo limpiado:** propiedad `zzz_mcp_test` archivada; grupo desechable borrado; entradas y cambios de prueba eliminados. **No se tocó el trabajo real del usuario** (entradas `gym_*`/`bakery_*`, cambios «Notas de salud»/«Descripción aficiones», grupo «Datos del gimnasio», formulario «Aficiones»).
- **Pendiente menor:** un vínculo formulario↔origen huérfano de baterías previas (sin tool de desvinculación en MCP).

---

## Resumen por herramienta

| # | Herramienta | Input usado | Resultado | Observaciones |
|---|-------------|-------------|-----------|---------------|
| 1 | `mcp_health` | — | OK | Devuelve `projectId` y timestamp. |
| 2 | `objects_list` | — | OK | 7 objetos (6 estándar + custom `Ratones` `2-204240191`). |
| 3 | `origins_list` | — | OK | 4 orígenes preexistentes. |
| 4 | `entries_list` | — | OK | 18 entradas del mapa de propiedades. |
| 5 | `custom_objects_list` | — | OK | 1 objeto custom (`ratones`), con su pending change de creación ya aplicado. |
| 6 | `forms_list` | — | OK | Lista vacía: el portal no tiene formularios sincronizados. |
| 7 | `groups_list` | `contacts` y `2-204240191` | OK | 15 grupos en contacts; 1 en `ratones`. |
| 8 | `custom_objects_get` | `name=ratones` | OK | Detalle completo + `objectTypeId` sandbox/production. |
| 9 | `properties_export_origin` | `originId=c07ea4cf…` (Campaña aficiones) | OK | Contrato JSON `schema_version: 2`, 14 propiedades. |
| 10 | `properties_pending_changes` | — | OK | 1 cambio pendiente preexistente («Orejas»). |
| 11 | `custom_objects_pending_changes` | — | OK | 1 cambio pendiente preexistente (`ratones`). |
| 12 | `forms_pending_changes` | — | OK | 1 cambio pendiente preexistente (formulario «Aficiones», 15 campos). |
| 13 | `properties_sync` | — | OK | `updated: 17, divergent: 0, missing: 1→2`. Regenera los pending de entradas «missing». |
| 14 | `forms_sync` | `includeLegacyV2=true` | OK | `imported: 0, updated: 0` (no hay formularios en el portal). |
| 15 | `origins_upsert` | `name="ZZZ Prueba MCP", type=integration` | OK | Crea origen, devuelve `id`. |
| 16 | `custom_objects_upsert_draft` | objeto `mcp_test_obj` | OK | Crea draft con `status: draft` y **sin** pending change asociado. |
| 17 | `forms_create_definition` | def. con `fields` a nivel raíz | OK (con matices) | Ver hallazgos. Con `fieldGroups` **falla**; además **descarta el `name`** del campo. |
| 18 | `groups_create` | `contacts / mcp_test_group / "ZZZ Pruebas MCP"` | OK | **Escritura real en HubSpot** (entorno activo). |
| 19 | `entries_upsert` | entrada `ZZZ Prueba MCP` (propiedad nueva `zzz_mcp_test`) | OK | No valida `originId` y **no genera** pending change por sí mismo (lo genera `properties_sync`). |
| 20 | `forms_link_origin` | form `2b43b059…` + origen de prueba | OK | Crea vínculo local (estado del proyecto). |
| 21 | `forms_coverage` | form `2b43b059…` + origen `c07ea4cf…` | OK (sin datos) | Devuelve `[]` para un formulario solo-local, sin error. |
| 22 | `forms_add_missing_fields` | form `2b43b059…` + origen `c07ea4cf…` | FALLO | `Formulario no encontrado`: exige formulario **sincronizado** en HubSpot. |
| 23 | `forms_get` | `formId` inexistente | OK (mecánica) | Responde `404` correctamente ante id desconocido. |
| 24 | `properties_apply_change` | `zzz_mcp_test` → **sandbox** | OK | `success:true`; verificado `appliedToSandbox: true`. **Escritura real (sandbox).** |
| 25 | `properties_discard_change` | cambio `zzz_mcp_test` | OK | `success:true`; el cambio desaparece de la cola local. |
| 26 | `custom_objects_apply_change` | cambio `ratones` (66da5033) → **sandbox** | OK | `success:true`. Idempotente: el objeto ya existía, no se duplicó ni se alteró. Probado con id de draft → `{"success":false,"error":"Cambio no encontrado"}`. |
| 27 | `custom_objects_discard_change` | — | NO EJECUTADO | Sin target propio: el único pending pertenece al objeto preexistente `ratones` del usuario (no se descarta su registro). |
| 28 | `entries_delete` | entrada de prueba `a4183637…` | OK | `success:true`. |

## Hallazgos

### 1. `forms_create_definition` — contrato de payload frágil
- Con el campo `fieldGroups` (la misma forma que devuelve `forms_pending_changes`) **rompe** con `MCP error -32603: Cannot read properties of undefined (reading 'map')`. Solo funciona pasando los campos en un array `fields` a nivel raíz.
- Al guardar, **descarta la propiedad `name`** de cada campo: el campo queda con `label`/`fieldType` pero sin `name`, lo que produce un formulario con campos sin propiedad HubSpot asociada.
- *Impacto:* alto. El payload que la propia API expone al leer no es reutilizable para escribir, y la pérdida del `name` genera definiciones inválidas.

### 2. CRUD incompleto — varios artefactos no se pueden borrar/deshacer vía MCP
No existe herramienta para eliminar/deshacer: orígenes (`origins_*` solo lista/crea), drafts de objetos custom, cambios pendientes de formularios (no hay `forms_discard_change`), vínculos `forms_link_origin`, ni grupos de propiedades (`groups_*` solo lista/crea). Esto deja residuo de pruebas que requiere limpieza manual.

### 3. `entries_upsert` no valida `originId`
Acepté (por una errata mía) un `originId` inexistente y la herramienta lo guardó sin avisar. Conviene validar referencias de origen.

### 4. Generación de pending changes de propiedades acoplada a `properties_sync`
Crear una entrada con propiedad nueva no genera el cambio pendiente; hay que ejecutar `properties_sync` para que aparezca. Además, `properties_sync` **regenera los `changeId`** en cada ejecución (son efímeros): hay que releer los pending antes de cada `apply`.

### 5. Inconsistencia en la resolución de formularios
`forms_link_origin` y `forms_coverage` aceptan el id de un formulario en estado local/pendiente, pero `forms_get` y `forms_add_missing_fields` solo resuelven formularios ya sincronizados en HubSpot (404 / «Formulario no encontrado»). Criterio dispar entre herramientas del mismo dominio.

### 6. No se puede crear un objeto custom de extremo a extremo solo con el MCP
`custom_objects_upsert_draft` deja siempre el objeto en `status: "draft"` con `pendingChanges: []` (el campo `status` enviado se ignora) y **no existe tool para promover el draft a un cambio `create` aplicable**. `custom_objects_apply_change` exige un `changeId` real: con el id del draft devuelve `{"success":false,"error":"Cambio no encontrado"}`. Conclusión: vía MCP solo se pueden aplicar cambios que ya existen en la cola (creados desde la UI). `custom_objects_apply_change` funciona (probado sobre `ratones` en sandbox, idempotente) pero es inalcanzable para drafts creados por el propio MCP. *Impacto: alto si se pretende crear objetos custom de forma programática.*

### 7. Errata en datos preexistentes (no corregida, solo señalada)
En la entrada **«Hobby»**, el origen **«Test integracion»** mapea `sourceValue: "theatre"` → `hubspotValue: "painting"` (debería ser `theatre`). Por norma del proyecto no se corrige; se deja constancia de la errata.

## Residuo de pruebas — requiere limpieza manual
No se pudo eliminar vía MCP (no hay herramienta). Recomendado limpiar desde la app / HubSpot:

| Artefacto | Identificador | Dónde |
|-----------|---------------|-------|
| Origen `ZZZ Prueba MCP` | `41bea23a-44ab-4c9d-be00-60def58ac162` | Estado del proyecto |
| Draft objeto custom `mcp_test_obj` | `f52d1d1f-069f-4159-8032-25a28417a9cb` | Estado del proyecto |
| Cambio pendiente formulario `ZZZ Prueba MCP` | `2b43b059-738d-48ed-91e9-a5d9a4e707b0` | Cola de pending de formularios |
| Vínculo form↔origen | `979f09fa-7512-40ac-a6ab-ba7db50f4fe9` | Estado del proyecto |
| Grupo de propiedades `ZZZ Pruebas MCP` (`mcp_test_group`) | en `contacts` | **HubSpot (real)** |
| Propiedad `zzz_mcp_test` | en `contacts` | **HubSpot sandbox (real)** |

> Nota: la entrada de mapa de prueba (`a4183637…`) sí se eliminó con `entries_delete`. No se tocó ningún dato preexistente del usuario (cambios «Orejas», `ratones`, formulario «Aficiones»).

## Cobertura final de objetos custom
- `custom_objects_apply_change`: **probado** sobre el cambio `ratones` en sandbox → `success:true` (idempotente, objeto ya existente; sin duplicar ni alterar datos del usuario). Con id de draft → `{"success":false,"error":"Cambio no encontrado"}`.
- Intento de creación end-to-end de un objeto custom nuevo vía MCP: **bloqueado** (ver hallazgo 6). `upsert_draft` no produce un cambio aplicable y no hay tool de promoción draft→pending.
- `custom_objects_discard_change`: no ejecutado; el único pending pertenece al objeto `ratones` del usuario y no se descarta su registro.

## Trabajos derivados (debug + test)
Dos work items propuestos a partir de los hallazgos (pendientes de validación y de destino — ver specs `SPEC-DEBUG-mcp-forms-custom-objects.md` y `SPEC-TEST-mcp-revops.md`):

1. **DEBUG** — Arreglar el contrato de escritura del MCP: (a) `forms_create_definition` debe aceptar `fieldGroups` y conservar el `name` de cada campo; (b) exponer la promoción draft→pending para objetos custom (o que `apply_change` resuelva un draft); (c) validar `originId` en `entries_upsert`. Hallazgos 1, 2, 3 y 6.
2. **TEST** — Batería de regresión automatizada del MCP `revops` que cubra las 28 tools (lectura, sync, escritura local, apply/discard) con asserts sobre los contratos, y casos negativos (payloads inválidos, ids inexistentes, idempotencia del apply). Debe dejar el proyecto limpio (teardown) y señalar el residuo no eliminable por falta de tools de borrado.
