# Crear una Private App en HubSpot y obtener el token

**Prerrequisitos:** ser administrador (Super Admin) del portal de HubSpot.
**Tiempo estimado:** 5 minutos.

La aplicación se conecta a HubSpot mediante un *Private App Token* (PAT). Es el método recomendado por HubSpot para integraciones internas y sustituye a las antiguas API Keys.

## Pasos

1. Inicia sesión en HubSpot con una cuenta de administrador.
2. Ve a **Configuración** (el icono del engranaje, arriba a la derecha).
3. En el menú lateral, abre **Integraciones → Aplicaciones privadas**.
4. Pulsa **Crear una aplicación privada**.
5. En la pestaña **Información básica**, escribe un nombre (por ejemplo, `RevOps Assistant`) y una descripción.
6. Abre la pestaña **Ámbitos (scopes)** y activa, como mínimo:
   - `crm.objects.contacts.read` — comprobación básica de conectividad.

   Añade además los scopes que requieran las características que vayas a usar (cada característica documenta los suyos; por ejemplo, automatización requiere `automation`).

   En concreto, el **consentimiento legal de formularios** (tipos de suscripción) requiere el scope **`communication_preferences.read`** (Subscription Preferences API), disponible en cualquier cuenta. Sin él, listar los tipos de suscripción devuelve un error de permisos (403).

   > **Importante:** anota qué scopes activas. La app **no puede leer ni mostrar los scopes** de una clave privada (HubSpot no los expone vía API), así que la lista de permisos solo es visible aquí, en HubSpot.
7. Pulsa **Crear aplicación** y confirma en el aviso.
8. HubSpot mostrará el **token de acceso**. Pulsa **Mostrar token** y luego **Copiar**.

## Resultado esperado

Tienes en el portapapeles un token que empieza por `pat-` (por ejemplo, `pat-eu1-xxxxxxxx`). Guárdalo en un lugar seguro de forma temporal; lo introducirás en la app en el siguiente tutorial.

## Preguntas frecuentes

**¿Puedo cambiar los scopes más tarde?** Sí. Vuelve a la aplicación privada, ajusta los ámbitos y guarda; HubSpot genera la actualización sin cambiar el token.

**¿Dónde se guarda el token en la app?** Cifrado en el llavero (keychain) de tu sistema operativo. Nunca se muestra en pantalla ni se escribe en los registros.

**Tengo una cuenta sandbox.** Repite estos pasos dentro del portal sandbox para obtener un token independiente; lo usarás en el entorno *Sandbox* de la app.
