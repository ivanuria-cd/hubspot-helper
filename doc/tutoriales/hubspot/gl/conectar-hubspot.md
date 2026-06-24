# Conectar a app con HubSpot

**Prerrequisitos:** ter un token de aplicación privada (ver *Crear unha Private App en HubSpot e obter o token*) e un proxecto creado na app.
**Tempo estimado:** 2 minutos.

## Pasos

1. Abre o teu proxecto na app.
2. No menú lateral, preme **Configuración**.
3. Na sección **Conectores**, preme **HubSpot**.
4. Asegúrate de ter seleccionada a lapela do contorno que queres configurar: **Produción** ou **Sandbox**.
5. Pega o token no campo **Private App Token**.
6. Preme **Gardar**.

A app verifica o token contra HubSpot e, se é válido, mostra o estado da conexión.

## Resultado esperado

- Un indicador **Conectado** (badge verde lima).
- A liña **Portal: _nome_ (_id_)** cos datos da túa conta de HubSpot.
- A **versión de API** en uso.

Se o token non é válido, verás unha mensaxe de erro explicando o motivo e a conexión non se gardará.

> **Sobre os permisos (scopes):** a app non mostra os scopes do token. As claves privadas de HubSpot non permiten consultar os seus ámbitos vía API, polo que a app non pode listalos. Revisa e axusta os scopes directamente en HubSpot, dentro da aplicación privada (ver *Crear unha Private App en HubSpot e obter o token*). Se a unha función lle falta un permiso, notaralo ao usala, non nesta pantalla.

## Preguntas frecuentes

**Vese o meu token nalgún sitio?** Non. O campo é de tipo contrasinal, o token gárdase cifrado no chaveiro do sistema e ocúltase (`[REDACTED]`) en calquera rexistro.

**Como desconecto o portal?** Na mesma pantalla, co contorno seleccionado, preme **Revogar**. Elimínase o token dese contorno.

**Que pasa se caduca ou cambio o token?** Volve pegar o novo token e preme **Gardar**; a app revalida e actualiza os datos do portal.
