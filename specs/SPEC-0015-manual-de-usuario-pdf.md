# SPEC-0015 — Manual de Usuario (PDF)

**Estado:** IMPLEMENTADO
**Branch:** feat/spec-0015-manual-usuario-pdf
**Fecha:** 2026-06-26
**Depende de:** SPEC-0002 … SPEC-0014 (features documentadas), SPEC-0012 (identidad visual)

---

## 1. Objetivo

Producir un **manual de usuario en PDF**, user-friendly y con identidad visual Cloud District, que cubra el uso completo de la aplicación de escritorio (RevOps App / HubSpotHelper). El manual está orientado a usuarios de negocio (RevOps), con pasos numerados, ejemplos concretos, mockups ilustrativos de cada pantalla y el orden de acciones para cada tarea.

Entregable único: `doc/manual/Manual-Usuario-RevOps-CloudDistrict.pdf`.

## 2. Contexto y decisiones de diseño

- **Fuente de contenido:** los 28 tutoriales canónicos en castellano de `doc/tutoriales/<feature>/es/`. El manual los consolida, ordena y enriquece; no los reescribe ni los sustituye.
- **Idioma:** castellano (`es`), versión canónica del proyecto.
- **Capturas:** no existen imágenes en el repositorio. Se generan **mockups vectoriales (SVG → imagen)** que recrean cada pantalla con la identidad Cloud District (decisión validada 2026-06-26). No se ejecuta la app para capturar.
- **Marca:** se aplica la guía Cloud District (SPEC-0000 §4 y skill `cloud-district-brand`): paleta `#090017` / `#14072B` / `#FFFFFF` / `#AFFC41` (solo como badge) / `#C7C2D3` / `#7F7790`, tipografías Poppins + Libre Baskerville Italic, ritmo dark/light, sin bullet points (em dash o numeración con badge lima).
- **Generación:** Python con `venv` (preferencia de proyecto). Maquetación HTML/CSS de marca → PDF. Mockups en SVG embebidos.
- **Ubicación:** carpeta nueva `doc/manual/` (fuentes del manual + PDF final). No toca código de producción ni SPECs de features.

## 3. Estructura del manual (orden de lectura)

1. **Portada** — título, subtítulo Libre Baskerville Italic, marca CD, versión y fecha.
2. **Índice** — con numeración de secciones y páginas.
3. **Introducción** — qué es la app, para quién, principio clave: *la app nunca escribe en HubSpot automáticamente; todo cambio es explícito*.
4. **Primeros pasos** — bienvenida, crear/abrir proyecto, recorrido por la interfaz (menú lateral, topbar, Dashboard).
5. **Conectores**
   - 5.1 HubSpot (crear Private App + scopes, conectar, cambiar entorno Producción/Sandbox).
   - 5.2 Google Drive (configurar credenciales, conectar, seleccionar carpeta, sincronizar).
   - 5.3 Capa MCP / API (conectar un cliente MCP).
6. **Gestión de Propiedades** — mapa, añadir propiedad, gestionar orígenes, mapear transformaciones, sincronizar, aplicar cambios, exportar JSON.
7. **Objetos Custom** — crear, editar, aplicar cambios, archivar.
8. **Formularios** — importar, crear, asociar a origen, añadir campos en bloque, revisar cobertura, sincronizar.
9. **Dashboard de estado** — entender el dashboard.
10. **Vista general de CRM** — recorrido de la vista índice.
11. **Guardar y compartir proyectos** — exportar e importar `.rvproj`.
12. **Apéndice** — glosario (estados `missing`/pendiente, origen, scope, PAT, entorno) y preguntas frecuentes consolidadas.

Cada tarea sigue el patrón: breve descripción → **prerrequisitos** → **pasos numerados** → mockup ilustrativo → **resultado esperado** → ejemplo/nota cuando aporta valor.

## 4. Mockups (recreaciones de pantalla)

Conjunto mínimo de mockups SVG de marca, uno por pantalla clave:

- Pantalla de bienvenida / selector de proyectos.
- Configuración → Conector HubSpot (estado Conectado).
- Configuración → Conector Google Drive.
- CRM → Propiedades (tabla + barra de acciones) y diálogo «Añadir propiedad».
- Panel lateral de orígenes/transformaciones.
- Objetos Custom (listado + asistente).
- Formularios (listado + cobertura).
- Dashboard de estado.
- Vista general de CRM.
- Diálogo de cambios pendientes / aplicar a HubSpot.

Los mockups son ilustrativos (no capturas literales); reflejan disposición y etiquetas reales de los tutoriales. Se marcan como «representación de la interfaz».

## 5. Implementación — tareas atómicas

1. Crear `doc/manual/` y `venv` con dependencias (motor HTML→PDF de marca).
2. Definir hoja de estilo de marca CD (CSS) y plantilla HTML del manual.
3. Construir los mockups SVG de §4.
4. Redactar el contenido de §3 consolidando los tutoriales `es`.
5. Renderizar el PDF.
6. Verificación (§6) y entrega del PDF.

## 6. Tests / verificación

- El PDF se genera sin error y abre correctamente.
- Todas las secciones de §3 están presentes y el índice cuadra con el contenido.
- Revisión de marca: paleta, tipografías y regla del verde lima respetadas; sin bullet points nativos.
- Cotejo de cada tarea contra su tutorial `es` de origen (pasos y etiquetas coinciden).
- Revisión de accesibilidad del color (contraste AA) en textos.

## 7. Scopes / permisos

Ninguno. El manual es documentación; no accede a HubSpot, Drive ni MCP en tiempo de ejecución.

## 8. Consideraciones de seguridad

- No incluir tokens, credenciales ni datos reales de portal en ejemplos (usar valores ficticios).

## 9. Documentación de usuario

Este SPEC **es** documentación de usuario. No genera tutoriales nuevos en `doc/tutoriales/`.

## 10. Criterios de aceptación

- [x] PDF generado en `doc/manual/Manual-Usuario-RevOps-CloudDistrict.pdf` (39 páginas, A4, fuentes embebidas).
- [x] Cubre todas las features (§3 completo): primeros pasos, conectores HubSpot/Drive/MCP, propiedades, objetos custom, formularios, dashboard, vista CRM, exportar/importar proyecto, glosario.
- [x] Identidad visual Cloud District aplicada (paleta, Poppins + serif italic, ritmo dark/light, sin bullets, lima solo como badge/numeración).
- [x] Mockups de §4 incluidos (13 recreaciones SVG de marca).
- [x] Pasos y ejemplos coherentes con los tutoriales canónicos `es`.
- [x] Validación humana del spec antes de la generación.

## 11. Notas de implementación

Generado con Python en `venv` (`--system-site-packages`) y WeasyPrint 69. Fuentes locales: Poppins (Light/Regular/Medium/Bold) y, como contrapunto serif por ausencia de Libre Baskerville y de red a Google Fonts, Liberation Serif Italic. Fuentes de los scripts de construcción (mockups, contenido, maquetación) en el espacio de trabajo temporal; el entregable es el PDF en `doc/manual/`. Contraste AA verificado: el gris terciario (`#7F7790`) no se usa en texto pequeño.

Los mockups se alinearon a la app real: tokens de `theme/palette.ts` (sidebar `#090017`, texto `#14072B`, chip de entorno navy=Producción / lima=Sandbox como en `TopBar`), estructura y orden de navegación de `nav-items.ts` con iconos y borde lima a la derecha del ítem activo (`Sidebar`), botones MUI con radio 8, breadcrumbs «Volver a proyectos › proyecto › sección» y el logo wordmark real `shared/assets/cloud-district-logo.svg` en bienvenida e importación.
