# Connectar l'app amb HubSpot

**Prerequisits:** tenir un Private App Token (vegeu *Crear una Private App a HubSpot i obtenir el token*) i un projecte creat a l'app.
**Temps estimat:** 2 minuts.

## Passos

1. Obre el teu projecte a l'app.
2. Al menú lateral, prem **Configuració**.
3. A la secció **Connectors**, prem **HubSpot**.
4. Assegura't de tenir seleccionada la pestanya de l'entorn que vols configurar: **Producció** o **Sandbox**.
5. Enganxa el token al camp **Private App Token**.
6. Prem **Desa**.

L'app verifica el token contra HubSpot i, si és vàlid, mostra l'estat de la connexió.

## Resultat esperat

- Un indicador **Connectat** (distintiu verd llima).
- La línia **Portal: _nom_ (_id_)** amb les dades del teu compte de HubSpot.
- La **versió d'API** en ús.

Si el token no és vàlid, veuràs un missatge d'error explicant el motiu i la connexió no es desarà.

> **Sobre els permisos (scopes):** l'app no mostra els scopes del token. Les claus privades de HubSpot no permeten consultar els seus àmbits via API, per la qual cosa l'app no els pot llistar. Revisa i ajusta els scopes directament a HubSpot, dins de l'aplicació privada (vegeu *Crear una Private App a HubSpot i obtenir el token*). Si a una funció li falta un permís, ho notaràs en usar-la, no en aquesta pantalla.

## Preguntes freqüents

**Es veu el meu token en algun lloc?** No. El camp és de tipus contrasenya, el token es desa xifrat al keychain del sistema i s'oculta (`[REDACTED]`) en qualsevol registre.

**Com desconnecto el portal?** A la mateixa pantalla, amb l'entorn seleccionat, prem **Revoca**. S'elimina el token d'aquell entorn.

**Què passa si caduca o canvio el token?** Torna a enganxar el nou token i prem **Desa**; l'app revalida i actualitza les dades del portal.
