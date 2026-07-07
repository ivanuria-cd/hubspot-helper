# Informe — Batería de pruebas MCP `revops` (tipologías SPEC-0006 §25)

**Fecha:** 2026-06-22
**Proyecto:** testing (`115e5407-93a0-43e0-b175-6a18d4e3291d`)
**Entorno de aplicación:** producción (autorizado)
**MCP:** reconstruido con §25 (confirmado: los payloads `create` incluyen los campos nuevos)
**Tema de datos:** gimnasio «Iron Temple» (origen `7ead71aa-28e1-440c-8e7c-43d0998940cd`, objeto `contacts`)

---

## 1. Resumen

Se probó el ciclo completo del SPEC-0006 vía MCP: orígenes, grupos, alta de entradas, sincronización,
cambios pendientes, aplicación a producción por entorno, divergencias, descarte y exportación. Se cubrieron
**todos los `type`/`fieldType`** y **todas las casuísticas de §25**.

- **20 de 21** propiedades creadas en producción correctamente.
- **1 fallo de permiso** (no de código): `dataSensitivity: sensitive` requiere un scope del token.
- **5 hallazgos** del MCP (uno bloqueante de UX: `groups_create` por entorno).

---

## 2. Cobertura por tipología (creación en producción)

| # | Propiedad | type / fieldType | Casuística §25 | Resultado |
|---|-----------|------------------|----------------|-----------|
| 1 | gym_member_code | string / text | — | OK |
| 2 | gym_member_notes | string / textarea | — | OK |
| 3 | gym_emergency_phone | string / phonenumber | — | OK |
| 4 | gym_welcome_message | string / html | — | OK |
| 5 | gym_waiver_file | string / file | — | OK |
| 6 | gym_billing_email | string / text | `textDisplayHint: email` | OK |
| 7 | gym_visits_total | number / number | — | OK |
| 8 | gym_monthly_fee | number / number | `numberDisplayHint: currency` + `showCurrencySymbol` | OK |
| 9 | gym_body_fat_pct | number / number | `numberDisplayHint: percentage` | OK |
| 10 | gym_avg_session | number / number | `numberDisplayHint: duration` | OK |
| 11 | gym_join_date | date / date | — | OK |
| 12 | gym_last_checkin | datetime / date | — | OK |
| 13 | gym_membership_tier | enumeration / select | opciones | OK |
| 14 | gym_preferred_shift | enumeration / radio→select | opciones | OK |
| 15 | gym_class_interests | enumeration / checkbox | opciones (multi) | OK |
| 16 | gym_newsletter_optin | enumeration / booleancheckbox | opciones true/false | OK |
| 17 | gym_towel_service | bool / booleancheckbox | — | OK (al 2.º intento, ver H4) |
| 18 | gym_total_due | number / calculation_equation | `calculationFormula` | OK (ver H5) |
| 19 | gym_member_uid | string / text | `hasUniqueValue` | OK |
| 20 | gym_assigned_trainer | enumeration / select | `externalOptions` + `referencedObjectType: OWNER` | OK |
| 21 | gym_health_notes | string / textarea | `dataSensitivity: sensitive` | FALLO (scope, ver H6) |

## 3. Cobertura de operaciones (cambios pendientes)

| Operación | Caso de prueba | Resultado |
|-----------|----------------|-----------|
| `create` | 20 altas (tabla §2) | OK |
| `update_label` | gym_visits_total → «Visitas totales (histórico)» | OK |
| `update_attributes` | gym_visits_total: añadir `description` | OK |
| `update_options` | gym_membership_tier: añadir «Estudiante» | OK |
| `update_field_type` | gym_preferred_shift: radio → select | OK |
| `discard_change` | descartar la falsa divergencia de gym_total_due | OK (con matiz, ver H3) |

## 4. Cobertura de orígenes / grupos / export

| Tool | Resultado |
|------|-----------|
| `origins_upsert` (crear) | OK |
| `origins_delete` | OK |
| `groups_list` | OK |
| `groups_create` | OK pero en entorno activo (ver H2) |
| `properties_export_origin` | OK (schema_version 2; incluye sources, mapeo enum y `boolean_format`) |
| `mcp_health` / `objects_list` / `entries_list` | OK |

---

## 5. Hallazgos

**H1 — `properties_sync` aborta (400) si una entrada referencia un objeto inaccesible.**
Había entradas residuales apuntando al objeto `2-204240191` (inexistente; el custom real es `2-204240190`).
`properties_sync` devolvía `400` global hasta borrarlas. El fallo de un objeto no se aísla del resto.
*Recomendación:* capturar el error por objeto y continuar, reportando el objeto problemático.

**H2 — `groups_create` solo escribe en el entorno activo (sin parámetro `environment`).**
El grupo `gym_information` se creó en el entorno activo (sandbox) y los `create` a **producción** fallaron con
`property group 'gym_information' does not exist`. Se resolvió repuntando las entradas al grupo estándar
`contactinformation` (existe en producción). *Recomendación:* añadir `environment` a `groups_create`, o que
`apply_change` garantice/cree el grupo en el entorno destino antes de crear la propiedad.

**H3 — `properties_discard_change` devuelve siempre `success: true`.**
Filtra por id sin verificar existencia; un id inexistente también devuelve éxito. (Coherente con SPEC-0006 §22;
conviene que valide y devuelva error si el id no existe.)

**H4 — `type: bool` necesita opciones true/false explícitas.**
El primer `create` de gym_towel_service falló: «Boolean properties must have exactly two options…».
HubSpot exige `options: [{value:'true'},{value:'false'}]` también para `bool`. *Recomendación:* el editor/MCP
debería inyectar automáticamente las dos opciones cuando `type === 'bool'` (hoy solo lo hace el usuario).

**H5 — Propiedad calculada: divergencia falsa recurrente en `calculationFormula`.**
gym_total_due se creó bien, pero cada `properties_sync` vuelve a marcarla `divergent` con un
`update_attributes` de `calculationFormula` (HubSpot devuelve/normaliza la fórmula de forma distinta a la
enviada). *Recomendación:* excluir `calculationFormula` del diff o normalizar antes de comparar.

**H6 — `dataSensitivity: sensitive` requiere scope adicional.**
gym_health_notes falló con «Missing required scope for: sensitive-data-property-create». El campo se envía
correctamente; es un permiso del token (PAT), no un defecto de código. *Recomendación:* documentar el scope
y degradar con mensaje claro.

**Nota operativa (lifecycle de `changeId`).** Confirmado SPEC-0006 §22.2: cada `properties_sync` **regenera**
los `changeId`. Aplicar con ids de una lectura anterior a un `sync` da «Cambio no encontrado». Flujo correcto:
`sync` → `pending_changes` → `apply_change` con esos ids, sin `sync` intermedio. Además, editar una entrada con
`entries_upsert` **no** regenera el payload de sus cambios pendientes (hay que `sync`).

---

## 6. Estado final del portal (sync final)

`{ updated: 33, divergent: 3, missing: 1 }`

- **missing 1:** gym_health_notes (H6).
- **divergent 3:** gym_total_due (H5) + dos divergencias preexistentes ajenas a la batería
  (Hobby y «Descripción aficiones», `update_attributes` de `description` no aplicados).

## 7. Limpieza

Las 20 propiedades `gym_*` quedan creadas en **producción** del portal de pruebas, en el grupo
«Contact information». El MCP no expone borrado de propiedades; si se desea retirarlas, hacerlo desde la UI de
HubSpot. El origen «Gimnasio Iron Temple» y sus entradas permanecen en el estado local del proyecto.
