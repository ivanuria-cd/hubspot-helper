# Conectar Google Drive

**Prerrequisitos:** tener un proyecto abierto en la app y una cuenta de Google.
**Tiempo estimado:** 2 minutos.

## Pasos

1. En el menú lateral, abre **Configuración**.
2. Dentro de **Conectores**, pulsa **Google Drive**.
3. Pulsa el botón **Conectar con Google**. Se abrirá tu navegador del sistema con la pantalla de autorización de Google.
4. Elige la cuenta de Google que quieras usar para este proyecto.
5. Revisa los permisos solicitados y acepta. La app solo pide:
   — Acceso a los archivos que ella misma crea o que tú selecciones (no a todo tu Drive).
   — Tu dirección de correo, para mostrar con qué cuenta estás conectado.
6. Cuando termines, vuelve a la app. Verás el estado **Conectado** junto a tu correo.

## Resultado esperado

La pantalla de Google Drive muestra «Conectado como tu-correo@ejemplo.com» y aparece la sección **Carpeta de trabajo** para el siguiente paso.

## Preguntas frecuentes

**¿Por qué se abre el navegador y no una ventana dentro de la app?**
Por seguridad y comodidad: así te autenticas en el navegador donde ya tienes la sesión de Google y la app nunca ve tu contraseña.

**¿La app puede ver todos mis archivos de Drive?**
No. El permiso está acotado (`drive.file`): solo puede ver y modificar los archivos que crea ella o los que tú elijas explícitamente.

**¿Dónde se guarda el acceso?**
Las credenciales se almacenan cifradas en el llavero del sistema operativo, nunca en texto plano ni en el repositorio.
