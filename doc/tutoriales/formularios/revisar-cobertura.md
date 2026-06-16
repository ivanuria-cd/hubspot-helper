# Revisar la cobertura de un formulario

**Prerrequisitos:** un formulario asociado a uno o varios orígenes (ver «Asociar un formulario a un origen»).
**Tiempo estimado:** 2 minutos

La cobertura indica si un formulario contiene todos los campos que su origen exige para un objeto. Sirve para detectar formularios incompletos antes de publicarlos.

## Pasos

1. Entra en **CRM → Formularios**.
2. Observa el badge de cobertura de cada formulario en la tabla.
3. Haz clic en un formulario para abrir su panel y ver el detalle por origen: cuántas propiedades se esperan, cuántas están presentes y cuáles faltan.

## Entender los estados

- **completo** (badge lima): todos los campos que el/los origen(es) definen están presentes en el formulario.
- **faltan N** (badge con aviso): faltan N campos definidos por el origen.
- **sin origen** (badge gris): el formulario no está asociado a ningún origen, así que no se puede evaluar.

## Resultado esperado

En el panel, cada propiedad esperada aparece marcada como presente o como ausente. Si faltan campos, verás el botón **Añadir campos que faltan**.

## Preguntas frecuentes

**¿La cobertura se calcula por objeto?** Sí. La comparación es por objeto + nombre técnico de la propiedad; un campo de otro objeto no cuenta.

**¿La cobertura mira los valores o solo la presencia del campo?** Solo comprueba que el campo (la propiedad destino) exista en el formulario.
