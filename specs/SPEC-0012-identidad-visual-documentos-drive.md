# SPEC-0012 — Identidad Visual de los Documentos de Drive

**Estado:** IMPLEMENTADO
**Branch:** feat/spec-0012-identidad-visual-documentos-drive
**Fecha:** 2026-06-23
**Depende de:** SPEC-0004, SPEC-0006, SPEC-0007, SPEC-0008

---

## 1. Objetivo

Elevar la calidad visual y la usabilidad de los artefactos que la app genera en Google Drive
(el Google Sheets legible y el Google Doc de estado companion), aplicando de forma coherente la
identidad de marca Cloud District (SPEC-0000 §4) y mejorando la legibilidad para usuarios de negocio.

Es un SPEC **transversal**: define el patrón visual canónico y los componentes/utilidades compartidos.
Cada SPEC de característica (0006, 0007, 0008) registra su adopción.

---

## 2. Contexto y decisiones de diseño

### 2.1 Estado actual (diagnóstico)

Generadores implicados: `connectors/google-drive/sheets-style.ts` (estilo del Sheets, definido en
SPEC-0006 §19) y `connectors/google-drive/cover-template.ts` (portada de Docs/Sheets, SPEC-0004 §2).

Limitaciones detectadas:

- **Portada del Sheets (`00_Portada`)** es texto plano en celdas. Solo A1 lleva fondo oscuro (una única
  celda, no banda a ancho completo) y B2 el acento lima. Sin jerarquía: secciones sin formato, sin merges,
  sin anchos fijos, sin espaciado.
- **Cabeceras de las hojas de datos** usan gris (`altRow #F3F3F3`), no la identidad de marca que el propio
  SPEC-0004 §2 define para cabeceras (fondo `#090017`, texto blanco).
- **Tipografía**: solo se aplica `Poppins` como familia, sin jerarquía de tamaños ni Libre Baskerville
  Italic para titulares (que la guía CD pide con moderación).
- **Columnas**: `autoResizeDimensions` puede dejar anchos desproporcionados; sin ajuste de texto (wrap),
  sin alto de fila, sin formato de fechas/números, sin formato condicional por estado.
- **Sin ayudas de uso**: no hay notas en cabeceras explicando columnas, ni validación de datos
  (desplegables) en zonas editables, ni congelado de primera columna, ni hoja-índice de navegación.
- **Doc de estado companion**: el cuerpo es JSON crudo; la portada en Docs (`renderCoverText`) es texto
  plano sin estilos nativos (sin Heading styles, sin colores de marca, sin tabla editable/no-editable).

### 2.2 Decisiones

- **Alcance completo** (decisión 2026-06-23): se cubren las mejoras de alto, medio y mayor impacto,
  incluida la hoja-índice con navegación y leyenda.
- **Doc de estado: estilar y mantener** (decisión 2026-06-23): el JSON permanece visible para preservar el
  round-trip 100% fiel de SPEC-0004 §15.5 (`writeFile`/`readFile`, `serializeXState`/`parseXState` sin
  cambios). Se le antepone una portada estilada y el JSON se ubica en un bloque claramente delimitado al
  final, bajo un encabezado «Datos técnicos — no editar». **No** se altera el mecanismo de carga ni el
  esquema versionado.
- **El diseño sigue siendo cerrado por versión de esquema** (SPEC-0004 §2): subir el nivel visual implica
  **incrementar `schema_version`** de los documentos afectados; documentos previos siguen siendo legibles,
  pero se reescriben con el nuevo estilo en la siguiente acción «Actualizar archivo en Drive».
- **Sin dependencias nuevas**: todo se construye con las APIs ya en uso (Sheets API v4 `batchUpdate`,
  Docs API `batchUpdate`). No se añaden paquetes npm (SPEC-0000 §11).
- **Separación por objeto: bloque por objeto** (decisión 2026-06-23). Ver §2.3.

### 2.3 Separación de datos por objeto (Sheets de propiedades)

Hoy el libro de propiedades (`buildPropertyMapTabs`, SPEC-0006, `schema_version: 2`) tiene 5 hojas fijas y
las hojas `02_Entradas`, `03_Fuentes` y `04_Opciones` mezclan todos los objetos con una columna `Objeto`.
Cuando se mapean propiedades de varios objetos, esas hojas crecen mucho.

Decisión: **un bloque de tres hojas por objeto** (Campos + Fuentes + Opciones), manteniendo globales la
portada, el índice y los orígenes. La hoja de propiedades del objeto se titula **`Campos`** (decisión
2026-06-23; «Entradas» se descartó por ambiguo de cara al usuario). Estructura resultante del libro:

```
00_Portada            (global)
01_Indice             (global, nueva — navegación + leyenda)
02_Origenes           (global)
<NN>_<Obj>_Campos     ┐
<NN>_<Obj>_Fuentes    │ un bloque por cada objeto con entradas
<NN>_<Obj>_Opciones   ┘
```

Reglas de construcción:

- **Agrupación**: las entradas se agrupan por `objectType`. Solo se generan hojas para objetos que tengan
  al menos una entrada. Las hojas `Fuentes`/`Opciones` de un objeto contienen únicamente las fuentes/opciones
  de las entradas de ese objeto. La hoja `Opciones` de un objeto se omite si ninguna de sus fuentes es de
  tipo `enum`.
- **Orden**: bloques ordenados por nombre de objeto; dentro del bloque, siempre Campos → Fuentes →
  Opciones. Prefijo numérico `NN_` incremental para fijar el orden de pestañas.
- **Nombres de pestaña**: `<NN>_<Obj>_<Tabla>` con `<Tabla>` ∈ {`Campos`, `Fuentes`, `Opciones`}. El
  nombre del objeto se **sanea** (se eliminan caracteres no
  válidos para títulos de hoja y se recorta) para respetar el límite de 100 caracteres de Google Sheets.
  Las **colisiones** tras el saneado se resuelven con sufijo numérico (`_2`, `_3`). El `objectType` real
  (sin sanear) se conserva como dato dentro de la hoja (no se «corrige» el nombre — coherente con la norma
  de no arreglar erratas, solo reflejarlas).
- **Navegación**: la hoja `01_Indice` lista cada objeto con su recuento de entradas/fuentes/opciones y
  enlaces internos a sus tres hojas. Pasa de recomendable a **necesaria** por la proliferación de pestañas.
- **Cargabilidad / round-trip**: no afecta a SPEC-0004 §15.5 — la carga de vuelta sigue leyendo el Doc de
  estado companion (JSON íntegro), no el Sheets. El número y nombre de pestañas del Sheets es solo
  presentación.
- **Estilo y protección**: `buildStyleRequests` ya itera por las hojas recibidas; cada hoja de datos por
  objeto recibe el mismo tratamiento de marca, congelado, notas, validación y formato condicional que §3.1.

---

## 3. Interfaz de usuario

Esta iteración **no** añade pantallas ni controles nuevos en la app. El cambio es en el aspecto de los
ficheros generados en Drive. Las acciones existentes («Actualizar archivo en Drive» / «Cargar desde
Drive», SPEC-0004 §15.3) permanecen idénticas.

### 3.1 Aspecto objetivo del Sheets

- **Hoja `00_Portada`**:
  — Fila 1: banner de marca a ancho completo (merge sobre las columnas usadas), fondo `#090017`, texto
    blanco, título en Poppins; alto de fila aumentado. Una o varias palabras clave del título pueden ir en
    Libre Baskerville Italic (con moderación, SPEC-0000 §4).
  — Fila de metadatos: `schema_version` con su valor en badge lima (`#AFFC41` fondo, texto `#14072B`) —
    único uso del acento, conforme a §4.
  — Secciones (qué es / para qué / cómo interpretarlo / qué puedes modificar / qué NO) con título de
    sección en `#14072B` negrita y cuerpo con ajuste de texto (wrap) y ancho fijo legible.
  — Pie de marca discreto.
- **Hoja-índice (nueva, `01_Indice`)**: tras la portada, lista cada objeto con sus recuentos
  (entradas/fuentes/opciones) y enlaces internos a sus hojas; leyenda de colores/estados. Es el punto de
  navegación principal del libro al haber un bloque de hojas por objeto (§2.3).
- **Hojas de datos**:
  — Cabecera con identidad de marca (fondo `#090017`, texto blanco, negrita), congelada (`frozenRowCount: 1`)
    y con la primera columna congelada cuando aporte contexto (`frozenColumnCount: 1`).
  — Bandas alternas claras conservadas (legibilidad), borde inferior de cabecera en `#14072B`.
  — `note` por celda de cabecera describiendo la columna e indicando si es editable.
  — Validación de datos (desplegables) en columnas de enumeración/estado; formato condicional por estado.
  — Anchos fijos por tipo de columna (en lugar de autoajuste indiscriminado) con ajuste de texto; formato
    de fechas/números vía patrones de la API.

### 3.2 Aspecto objetivo del Doc de estado

- Portada con estilos nativos de Docs: título con Heading 1 sobre banda de color de marca, secciones con
  Heading 2 y una tabla de dos columnas «Puedes modificar / No debes modificar».
- El JSON íntegro se mantiene al final bajo un encabezado «Datos técnicos — no editar», en bloque
  monoespaciado claramente delimitado. El parser sigue leyendo el JSON tal cual (SPEC-0004 §15.5).

---

## 4. Modelo de datos / contratos de API

Sin cambios en los contratos IPC ni en los tipos compartidos de Drive. Cambios internos en los generadores:

- **`sheets-style.ts`** (SPEC-0006 §19): se amplía `buildStyleRequests` para emitir los nuevos `requests`
  de `spreadsheets.batchUpdate` (banner con `mergeCells`, alto de fila vía `updateDimensionProperties`,
  cabecera de marca, `frozenColumnCount`, `setDataValidation`, `addConditionalFormatRule`,
  `repeatCell` con `wrapStrategy` y `numberFormat`, `updateCells` con `note` en cabeceras, anchos fijos vía
  `updateDimensionProperties`). Sigue siendo puro, idempotente (limpia reglas previas) y testeable.
- **`cover-template.ts`** (SPEC-0004 §2): se añade un generador de `requests` de la **Docs API** que aplica
  estilos nativos (named styles `HEADING_1`/`HEADING_2`, `updateTextStyle`, `insertTable`,
  `updateParagraphStyle` con `shading` para la banda de marca) en lugar del actual `insertText` de texto
  plano. `renderCoverText` se conserva como fallback para Sheets/portada textual.
- **`property-management/sheets-model.ts`** (SPEC-0006): `buildPropertyMapTabs` deja de emitir las tres
  hojas globales `02_Entradas`/`03_Fuentes`/`04_Opciones` y pasa a emitir `00_Portada`, `01_Indice`,
  `02_Origenes` y, por cada objeto con entradas, un bloque `<NN>_<Obj>_Campos` / `<NN>_<Obj>_Fuentes` /
  `<NN>_<Obj>_Opciones` (§2.3). Se añaden utilidades puras de saneado de nombre de hoja y resolución de
  colisiones. Sigue siendo puro y testeable. La columna `Objeto`, ahora redundante dentro de cada bloque, se
  conserva como dato (no se elimina información).
- **Constantes de marca**: la paleta `CD` de `sheets-style.ts` se extrae a un módulo compartido
  (`connectors/google-drive/brand.ts`) reutilizable por Sheets y Docs, con tokens de tipografía (familias y
  tamaños por nivel). Fuente única de verdad de §4.
- **`schema_version`**: se incrementa en los documentos afectados (propiedades, objetos custom, formularios).
  La constante por feature vive donde ya se define hoy; este SPEC solo fija el bump.

---

## 5. Implementación — tareas atómicas

1. **`connectors/google-drive/brand.ts`** — extraer paleta `CD` + tokens tipográficos; refactor de
   `sheets-style.ts` para consumirlos (sin cambio de comportamiento todavía).
2. **Sheets — portada** — banner a ancho completo (`mergeCells`), alto de fila, badge lima del
   `schema_version`, secciones con jerarquía y wrap.
3. **Sheets — separación por objeto** — `buildPropertyMapTabs` emite un bloque Campos/Fuentes/Opciones por
   objeto (§2.3); utilidades de saneado de nombre y resolución de colisiones.
4. **Sheets — hoja-índice** — generación de `01_Indice` con recuentos, enlaces internos por objeto y leyenda.
5. **Sheets — cabeceras de datos** — identidad de marca, congelado de fila/columna, `note` por columna.
6. **Sheets — datos** — anchos fijos por tipo, `wrapStrategy`, `numberFormat`, validación de datos y
   formato condicional por estado.
7. **Docs — portada estilada** — `requests` de Docs API (headings, banda de marca, tabla
   editable/no-editable); JSON al final bajo «Datos técnicos — no editar».
8. **Bump de `schema_version`** en los features afectados + nota de migración.
9. **Adopción en SPECs de característica** — secciones nuevas en SPEC-0006 / 0007 / 0008 referenciando este
   SPEC.
10. **Commit** — `feat(drive): identidad visual de los documentos generados (SPEC-0012)`.

---

## 6. Tests requeridos

### Unitarios
- `brand.spec.ts` — los tokens de marca exponen la paleta y tipografía esperadas; ningún uso de lima sobre
  oscuro como color de elemento (solo badge).
- `sheets-style.spec.ts` (ampliado) — la portada emite `mergeCells` del banner y badge del
  `schema_version`; las cabeceras de datos usan fondo `#090017`; se emiten `setDataValidation`,
  `addConditionalFormatRule`, `note` en cabeceras y anchos fijos; idempotencia (limpia reglas previas).
- `cover-template.spec.ts` (ampliado) — el generador de Docs produce headings nativos, la tabla
  editable/no-editable y el bloque JSON final; `renderCoverText` se mantiene para el fallback.
- `sheets-model.spec.ts` (ampliado) — `buildPropertyMapTabs` emite un bloque
  Campos/Fuentes/Opciones por objeto con entradas; omite `Opciones` sin `enum`; ordena por objeto y
  prefija el orden; sanea nombres de hoja al límite de 100 caracteres y resuelve colisiones con sufijo;
  `01_Indice` refleja los recuentos por objeto.

### Funcionales
- No aplica UI nueva. Se verifica que las acciones existentes de Drive siguen funcionando (mock del
  conector) y que el round-trip de carga (SPEC-0004 §15.5) sigue siendo fiel pese al nuevo formato del Doc.

> Nota: «Prohibido modificar tests unitarios aprobados sin SPEC» (SPEC-0000 §8). Este SPEC autoriza la
> ampliación de `sheets-style.spec.ts` y `cover-template.spec.ts`.

---

## 7. Scopes / permisos necesarios

Ninguno nuevo. Se usan los scopes ya concedidos (`drive.file`, `drive.metadata.readonly`,
`userinfo.email`, SPEC-0004 §5) y las APIs Sheets v4 / Docs ya en uso.

---

## 8. Consideraciones de seguridad

- Sin nuevas dependencias npm (SPEC-0000 §11).
- El Doc de estado sigue conteniendo el JSON del estado local; no se añade información sensible nueva. El
  bloque «Datos técnicos» es solo presentación.
- Los rangos protegidos del Sheets se mantienen (gestionado por la app — no editar).

---

## 9. Documentación de usuario

Actualizar el tutorial `doc/tutoriales/google-drive/es/sincronizar-archivos.md` (y traducciones `ca`/`eu`/`en`,
SPEC-0009) para reflejar el nuevo aspecto de los ficheros y aclarar qué zonas son editables. No se crean
tutoriales nuevos.

---

## 10. Criterios de aceptación

- [x] El Sheets muestra portada con banner de marca a ancho completo (`mergeCells`), badge lima del
      `schema_version` y secciones con ajuste de texto.
- [x] El libro de propiedades genera un bloque Campos/Fuentes/Opciones por objeto con entradas (§2.3),
      con nombres de hoja saneados al límite de 100 caracteres y colisiones resueltas.
- [x] Existe una hoja-índice (`01_Indice`) con recuentos por objeto y referencias a sus hojas (ver §11).
- [x] Las cabeceras de las hojas de datos usan la identidad de marca (fondo `#090017`, texto blanco),
      con congelado de fila/columna y notas por columna.
- [x] La columna `Estado` tiene validación (desplegable) y formato condicional; ajuste de texto y anchos
      fijos en todas las hojas de datos.
- [x] El Doc de estado tiene portada estilada (headings nativos H1/H2 + pie) y el JSON al final bajo el
      marcador estilado; el round-trip de carga (SPEC-0004 §15.5) sigue siendo fiel (estilado no altera el
      texto exportado).
- [x] `schema_version` del Sheets de propiedades incrementado a 3 (cambio de layout). Forms/objetos: layout
      sin cambio estructural (solo estilo), sin bump (ver §11).
- [x] Ningún uso de lima (`#AFFC41`) sobre oscuro como color de elemento (solo badge), conforme a §4.
- [x] Tests unitarios ampliados en verde (38 tests directos; 172 en las suites de los directorios afectados;
      `npx tsc --noEmit` sin errores).
- [x] SPEC-0006/0007/0008 actualizados con su sección de adopción.
- [ ] PR creada, revisada y mergeada (gestión Git del usuario).

---

## 11. Notas de implementación (2026-06-23)

- **`brand.ts`** (`connectors/google-drive/brand.ts`): fuente única de paleta CD + tipografía + `hexToRgb`.
  `sheets-style.ts` y `cover-template.ts` lo consumen. `sheets-style.ts` reexporta `CD` por compatibilidad.
- **Sheets — `buildStyleRequests`**: banner de portada con `mergeCells` + alto de fila + texto blanco sobre
  `#090017`; badge lima en B2; cabeceras de datos a marca; `frozenRowCount`/`frozenColumnCount`; notas por
  columna (`updateCells` `fields: 'note'`); `addBanding`; `wrapStrategy: WRAP`; anchos fijos
  (`updateDimensionProperties` 200 px) en lugar de autoajuste; columna `Estado` con `setDataValidation`
  (ONE_OF_LIST de los valores presentes) y `addConditionalFormatRule` por valor; protección por hoja.
- **Sheets — `buildPropertyMapTabs`**: hojas globales `00_Portada`/`01_Indice`/`02_Origenes` y bloque por
  objeto `<NN>_<Obj>_(Campos|Fuentes|Opciones)` (§2.3). `SHEETS_SCHEMA_VERSION` 2 → 3. La hoja de
  propiedades del objeto se titula `Campos` (no «Entradas»; decisión 2026-06-23).
- **Docs — `buildCoverDocStyleRequests`** (`cover-template.ts`) + `buildDocStyleRequests` (`client.ts`):
  estilos nativos calculados de forma determinista sobre el layout de `renderCoverText`; se **anexan** tras
  el `insertText` en `createManagedDocument`/`replaceDocumentBody`. No se modifica el texto, por lo que el
  round-trip (SPEC-0004 §15.5) no cambia y `client.spec.ts` sigue en verde (solo afirma `requests[0]/[1]`).

### Decisiones pragmáticas (refinan §3)

- **Índice sin hipervínculos por `gid`**: el builder es puro y no conoce los `sheetId`/`gid` (los asigna
  Google al crear las hojas), así que `01_Indice` referencia las hojas por **nombre** (navegación por la
  barra de pestañas), no con `=HYPERLINK`. Hipervínculos reales por `gid` quedan como posible iteración en
  la capa de cliente (donde se conocen los `sheetId`).
- **Doc: secciones estiladas en vez de tabla literal**: la «tabla editable/no-editable» de §3.2 se
  implementa como secciones con `HEADING_2` (las dos secciones ya existentes de la portada) en lugar de un
  `insertTable` de Docs, para no introducir fragilidad de índices que pudiera afectar al texto exportado.
- **`numberFormat` por columna diferido**: se aplica `WRAP` + anchos fijos; el formato de fecha/número por
  columna se deja para una iteración posterior (los valores actuales son mayoritariamente texto).
- **Ocultar ID/Objeto y congelar «Nombre», solo en hojas «Campos»** (2026-06-23): en `buildStyleRequests`,
  cuando el título de la hoja termina en `_Campos`, se ocultan (`hiddenByUser`, sin borrar datos) las
  columnas cuyo encabezado es `ID` u `Objeto` y se congela hasta la columna `Nombre` inclusive
  (`frozenColumnCount`). El resto de hojas conserva el congelado de la primera columna. Cubierto por
  `sheets-style.spec.ts` (test «oculta las columnas ID y Objeto y congela hasta Nombre»).
- **Test autorizado adicional**: además de los listados en §6, se actualizó `sheets-writer.spec.ts`
  (aserción `SHEETS_SCHEMA_VERSION` 2 → 3) por el bump de layout. Autorizado por este SPEC (SPEC-0000 §8).
- **Verificación**: ejecutado en el sandbox `npx vitest run` (directorios `connectors/google-drive`,
  `property-management`, `forms-management`, `custom-objects`) → 172/172; `npx tsc --noEmit` → 0 errores.
  Pendiente la ejecución de la suite completa + e2e en la máquina del usuario.
