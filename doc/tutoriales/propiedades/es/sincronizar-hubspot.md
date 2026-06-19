# Sincronizar el mapa con HubSpot

**Prerrequisitos:** conector de HubSpot configurado en el proyecto.
**Tiempo estimado:** 3 minutos

La sincronización compara la definición de propiedades del proyecto con el estado real del portal de HubSpot y clasifica cada propiedad según su estado.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Comprueba en la barra superior de la app qué entorno de HubSpot está activo (producción o sandbox).
3. Pulsa **Sincronizar HubSpot**. La app lee las propiedades del portal mediante la API de propiedades de HubSpot.
4. Al terminar verás un resumen: cuántas propiedades están al día, cuántas divergentes y cuántas sin crear.

## Entender los estados

- **exists** (badge verde lima): la propiedad existe en HubSpot y coincide con la definición del proyecto.
- **divergent** (badge gris): existe pero difiere (por ejemplo, distinta etiqueta u opciones). Genera cambios pendientes.
- **missing** (badge gris oscuro): no existe en HubSpot. Genera un cambio pendiente de creación.

## Resultado esperado

La tabla muestra cada propiedad con su badge de estado. Las propiedades del portal que aún no estaban en el mapa se importan como `exists`. El mapa actualizado se vuelca al Google Sheets del proyecto.

## Preguntas frecuentes

**¿La sincronización modifica HubSpot?** No. Solo lee. Cualquier cambio en el portal se propone como cambio pendiente y requiere tu confirmación.

**¿Sobre qué objetos sincroniza?** Sobre los objetos presentes en el mapa; si está vacío, sobre contacts, deals y companies por defecto.
