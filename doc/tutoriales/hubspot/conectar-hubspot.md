# Conectar la app con HubSpot

**Prerrequisitos:** tener un token de aplicación privada (ver *Crear una Private App en HubSpot y obtener el token*) y un proyecto creado en la app.
**Tiempo estimado:** 2 minutos.

## Pasos

1. Abre tu proyecto en la app.
2. En el menú lateral, pulsa **Configuración**.
3. En la sección **Conectores**, pulsa **HubSpot**.
4. Asegúrate de tener seleccionada la pestaña del entorno que quieres configurar: **Producción** o **Sandbox**.
5. Pega el token en el campo **Private App Token**.
6. Pulsa **Guardar**.

La app verifica el token contra HubSpot y, si es válido, muestra el estado de la conexión.

## Resultado esperado

- Un indicador **Conectado** (badge verde lima).
- La línea **Portal: _nombre_ (_id_)** con los datos de tu cuenta de HubSpot.
- La **versión de API** en uso.

Si el token no es válido, verás un mensaje de error explicando el motivo y la conexión no se guardará.

> **Sobre los permisos (scopes):** la app no muestra los scopes del token. Las claves privadas de HubSpot no permiten consultar sus ámbitos vía API, por lo que la app no puede listarlos. Revisa y ajusta los scopes directamente en HubSpot, dentro de la aplicación privada (ver *Crear una Private App en HubSpot y obtener el token*). Si a una función le falta un permiso, lo notarás al usarla, no en esta pantalla.

## Preguntas frecuentes

**¿Se ve mi token en algún sitio?** No. El campo es de tipo contraseña, el token se guarda cifrado en el llavero del sistema y se oculta (`[REDACTED]`) en cualquier registro.

**¿Cómo desconecto el portal?** En la misma pantalla, con el entorno seleccionado, pulsa **Revocar**. Se elimina el token de ese entorno.

**¿Qué pasa si caduca o cambio el token?** Vuelve a pegar el nuevo token y pulsa **Guardar**; la app revalida y actualiza los datos del portal.
