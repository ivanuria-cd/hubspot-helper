# Configurar les credencials de Google

**Per a què serveix:** indicar a l'app l'**ID de client d'OAuth** (i, si el teu client ho exigeix, el **secret**) que s'usen per connectar amb Google Drive. Abans això vivia només al fitxer `.env`; ara pots fer-ho des de la mateixa app.
**Temps estimat:** 2 minuts.

## Què necessites de Google Cloud

Només l'**ID de client d'OAuth** del projecte de Google Cloud (un valor que acaba en `.apps.googleusercontent.com`). No cal cap API key: el selector de carpeta de l'app no usa el Google Picker.

> Si el teu client d'OAuth és de tipus «App d'escriptori» i exigeix secret, tingues també a mà el **secret de client**. Per a clients amb PKCE no sol ser necessari.

## Passos

1. Ves a **Configuració > Connectors > Google Drive**.
2. A la targeta **Credencials de Google Cloud**, enganxa el teu **ID de client** al camp corresponent.
3. (Opcional) Introdueix el **secret de client** si el teu client ho requereix.
4. Prem **Desa**. El canvi té efecte a l'instant: no cal reiniciar.

## Origen de cada credencial

Cada camp mostra una etiqueta amb el seu origen:

- **App** — el valor està desat a l'aplicació (l'ID a la configuració local; el secret al keychain del sistema operatiu).
- **.env** — no hi ha valor a l'app i s'està usant el del fitxer `.env` com a reserva.

El valor configurat a l'app té prioritat sobre el `.env`.

## Esborrar credencials

Prem **Esborra** per eliminar de l'app l'ID i el secret. Si existeix un valor a `.env`, l'app el tornarà a usar automàticament.

## Preguntes freqüents

**On es desa el secret?**
Al keychain del sistema operatiu (el mateix lloc on es desen els tokens d'accés), mai en text pla. L'app només mostra si està configurat, sense revelar-ne el valor.

**Per què ja no es demana una API key?**
La selecció de carpeta usa un selector propi que navega pel teu Drive només amb OAuth. El Google Picker, que sí que exigia API key, s'ha retirat.

**He canviat l'ID de client i el compte continua connectat.**
La connexió existent es manté fins que desconnectis. Si canvies de projecte de Google Cloud, desconnecta i torna a connectar per autoritzar amb les noves credencials.
