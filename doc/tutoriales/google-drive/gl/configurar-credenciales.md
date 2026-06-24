# Configurar as credenciais de Google

**Para que serve:** indicarlle á app o **ID de cliente de OAuth** (e, se o teu cliente o esixe, o **segredo**) que se usan para conectar con Google Drive. Antes isto vivía só no ficheiro `.env`; agora podes facelo desde a propia app.
**Tempo estimado:** 2 minutos.

## Que necesitas de Google Cloud

Só o **ID de cliente de OAuth** do proxecto de Google Cloud (un valor que remata en `.apps.googleusercontent.com`). Non fai falta ningunha API key: o selector de cartafol da app non usa o Google Picker.

> Se o teu cliente de OAuth é de tipo «App de escritorio» e esixe segredo, ten tamén á man o **segredo de cliente**. Para clientes con PKCE non adoita ser necesario.

## Pasos

1. Vai a **Configuración > Conectores > Google Drive**.
2. Na tarxeta **Credenciais de Google Cloud**, pega o teu **ID de cliente** no campo correspondente.
3. (Opcional) Introduce o **segredo de cliente** se o teu cliente o require.
4. Preme **Gardar**. O cambio xera efecto ao instante: non fai falta reiniciar.

## Orixe de cada credencial

Cada campo mostra unha etiqueta coa súa orixe:

- **App** — o valor está gardado na aplicación (o ID na configuración local; o segredo no chaveiro do sistema operativo).
- **.env** — non hai valor na app e estase usando o do ficheiro `.env` como reserva.

O valor configurado na app ten prioridade sobre o `.env`.

## Borrar credenciais

Preme **Borrar** para eliminar da app o ID e o segredo. Se existe un valor en `.env`, a app volverá usalo automaticamente.

## Preguntas frecuentes

**Onde se garda o segredo?**
No chaveiro do sistema operativo (o mesmo sitio onde se gardan os tokens de acceso), nunca en texto plano. A app só mostra se está configurado, sen revelar o seu valor.

**Por que xa non se pide unha API key?**
A selección de cartafol usa un selector propio que navega o teu Drive só con OAuth. O Google Picker, que si esixía API key, retirouse.

**Cambiei o ID de cliente e a conta segue conectada.**
A conexión existente mantense ata que desconectes. Se cambias de proxecto de Google Cloud, desconecta e volve conectar para autorizar coas novas credenciais.
