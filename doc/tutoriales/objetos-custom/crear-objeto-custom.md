# Crear un objeto custom

**Prerrequisitos:** tener configurado el conector de HubSpot (al menos un entorno) y haber abierto un proyecto.
**Tiempo estimado:** 5–10 minutos

Los objetos custom te permiten representar en HubSpot entidades propias de tu negocio (máquinas, contratos, vehículos…) que no encajan en los objetos estándar. Esta pantalla crea la **definición** del objeto; los registros (instancias) se gestionan después en HubSpot.

## Pasos

1. En el menú lateral, dentro de **CRM**, abre **Objetos custom**.
2. Pulsa **Objeto custom** para abrir el asistente de creación.
3. **Identidad**:
   - **Nombre interno**: identificador técnico (solo minúsculas, números y guiones bajos; empieza por letra). **No podrás cambiarlo después.**
   - **Etiqueta singular** y **Etiqueta plural**: cómo se llamará el objeto en la interfaz (p. ej. «Máquina» / «Máquinas»).
   - **Descripción** (opcional): para qué sirve el objeto.
4. **Propiedades iniciales**: añade las propiedades que tendrá el objeto. Por cada una indica **Nombre interno** (identificador técnico), **Etiqueta**, **Tipo** y **Tipo de campo**. El **Tipo de campo** es un desplegable que se ajusta automáticamente al tipo elegido (no tienes que adivinar el valor). Marca **Único** si esa propiedad identifica de forma unívoca cada registro. Usa **Añadir propiedad** para sumar más.
5. **Visualización** (los desplegables muestran la **etiqueta** de cada propiedad):
   - **Propiedad principal**: la propiedad que da nombre a cada registro (obligatoria).
   - **Requeridas**, **Secundarias** y **Búsqueda**: selecciona, entre las propiedades definidas, cuáles son obligatorias, cuáles se muestran bajo el nombre y cuáles se indexan para buscar.
6. **Asociaciones** (opcional): elige con qué objetos (contactos, empresas, otros custom) podrá relacionarse.
7. Pulsa **Guardar**. El objeto se añade como **borrador** con un cambio pendiente de tipo «crear».

## Resultado esperado

El objeto aparece en la lista con estado **borrador** (✕). Todavía no existe en HubSpot: para crearlo, ve a sus cambios pendientes y aplícalo primero en sandbox y luego en producción (ver «Aplicar cambios de objetos en HubSpot»).

## Preguntas frecuentes

**¿Por qué no puedo cambiar el nombre interno luego?** Es una restricción de HubSpot: el nombre es inmutable una vez creado el objeto. Las etiquetas sí se pueden cambiar.

**¿Tengo que crear todas las propiedades aquí?** No. Puedes crear el objeto con las mínimas y añadir más propiedades después desde la pantalla de **Propiedades**.
