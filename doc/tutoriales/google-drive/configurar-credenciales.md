# Configurar las credenciales de Google

**Para qué sirve:** indicar a la app el **ID de cliente de OAuth** (y, si tu cliente lo exige, el **secreto**) que se usan para conectar con Google Drive. Antes esto vivía solo en el fichero `.env`; ahora puedes hacerlo desde la propia app.
**Tiempo estimado:** 2 minutos.

## Qué necesitas de Google Cloud

Solo el **ID de cliente de OAuth** del proyecto de Google Cloud (un valor que termina en `.apps.googleusercontent.com`). No hace falta ninguna API key: el selector de carpeta de la app no usa el Google Picker.

> Si tu cliente de OAuth es de tipo «App de escritorio» y exige secreto, ten también a mano el **secreto de cliente**. Para clientes con PKCE no suele ser necesario.

## Pasos

1. Ve a **Configuración > Conectores > Google Drive**.
2. En la tarjeta **Credenciales de Google Cloud**, pega tu **ID de cliente** en el campo correspondiente.
3. (Opcional) Introduce el **secreto de cliente** si tu cliente lo requiere.
4. Pulsa **Guardar**. El cambio surte efecto al instante: no hace falta reiniciar.

## Origen de cada credencial

Cada campo muestra una etiqueta con su origen:

- **App** — el valor está guardado en la aplicación (el ID en la configuración local; el secreto en el llavero del sistema operativo).
- **.env** — no hay valor en la app y se está usando el del fichero `.env` como reserva.

El valor configurado en la app tiene prioridad sobre el `.env`.

## Borrar credenciales

Pulsa **Borrar** para eliminar de la app el ID y el secreto. Si existe un valor en `.env`, la app volverá a usarlo automáticamente.

## Preguntas frecuentes

**¿Dónde se guarda el secreto?**
En el llavero del sistema operativo (el mismo sitio donde se guardan los tokens de acceso), nunca en texto plano. La app solo muestra si está configurado, sin revelar su valor.

**¿Por qué ya no se pide una API key?**
La selección de carpeta usa un selector propio que navega tu Drive solo con OAuth. El Google Picker, que sí exigía API key, se ha retirado.

**He cambiado el ID de cliente y la cuenta sigue conectada.**
La conexión existente se mantiene hasta que desconectes. Si cambias de proyecto de Google Cloud, desconecta y vuelve a conectar para autorizar con las nuevas credenciales.
