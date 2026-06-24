# Crear unha Private App en HubSpot e obter o token

**Prerrequisitos:** ser administrador (Super Admin) do portal de HubSpot.
**Tempo estimado:** 5 minutos.

A aplicación conéctase a HubSpot mediante un *Private App Token* (PAT). É o método recomendado por HubSpot para integracións internas e substitúe ás antigas API Keys.

## Pasos

1. Inicia sesión en HubSpot cunha conta de administrador.
2. Vai a **Configuración** (a icona da engrenaxe, arriba á dereita).
3. No menú lateral, abre **Integracións → Aplicacións privadas**.
4. Preme **Crear unha aplicación privada**.
5. Na lapela **Información básica**, escribe un nome (por exemplo, `RevOps Assistant`) e unha descrición.
6. Abre a lapela **Ámbitos (scopes)** e activa, como mínimo:
   - `crm.objects.contacts.read` — comprobación básica de conectividade.

   Engade ademais os scopes que requiran as características que vaias usar (cada característica documenta os seus; por exemplo, automatización require `automation`).

   En concreto, o **consentimento legal de formularios** (tipos de subscrición) require o scope **`communication_preferences.read`** (Subscription Preferences API), dispoñible en calquera conta. Sen el, listar os tipos de subscrición devolve un erro de permisos (403).

   > **Importante:** anota que scopes activas. A app **non pode ler nin mostrar os scopes** dunha clave privada (HubSpot non os expón vía API), así que a lista de permisos só é visible aquí, en HubSpot.
7. Preme **Crear aplicación** e confirma no aviso.
8. HubSpot mostrará o **token de acceso**. Preme **Mostrar token** e logo **Copiar**.

## Resultado esperado

Tes no portapapeis un token que comeza por `pat-` (por exemplo, `pat-eu1-xxxxxxxx`). Gárdao nun lugar seguro de forma temporal; introduciralo na app no seguinte tutorial.

## Preguntas frecuentes

**Podo cambiar os scopes máis tarde?** Si. Volve á aplicación privada, axusta os ámbitos e garda; HubSpot xera a actualización sen cambiar o token.

**Onde se garda o token na app?** Cifrado no chaveiro (keychain) do teu sistema operativo. Nunca se mostra en pantalla nin se escribe nos rexistros.

**Teño unha conta sandbox.** Repite estes pasos dentro do portal sandbox para obter un token independente; usaralo no contorno *Sandbox* da app.
