# Crear una Private App a HubSpot i obtenir el token

**Prerequisits:** ser administrador (Super Admin) del portal de HubSpot.
**Temps estimat:** 5 minuts.

L'aplicació es connecta a HubSpot mitjançant un *Private App Token* (PAT). És el mètode recomanat per HubSpot per a integracions internes i substitueix les antigues API Keys.

## Passos

1. Inicia sessió a HubSpot amb un compte d'administrador.
2. Ves a **Configuració** (la icona de l'engranatge, a dalt a la dreta).
3. Al menú lateral, obre **Integracions → Aplicacions privades**.
4. Prem **Crea una aplicació privada**.
5. A la pestanya **Informació bàsica**, escriu un nom (per exemple, `RevOps Assistant`) i una descripció.
6. Obre la pestanya **Àmbits (scopes)** i activa, com a mínim:
   - `crm.objects.contacts.read` — comprovació bàsica de connectivitat.

   Afegeix a més els scopes que requereixin les característiques que vagis a usar (cada característica documenta els seus; per exemple, automatització requereix `automation`).

   > **Important:** anota quins scopes actives. L'app **no pot llegir ni mostrar els scopes** d'una clau privada (HubSpot no els exposa via API), així que la llista de permisos només és visible aquí, a HubSpot.
7. Prem **Crea aplicació** i confirma a l'avís.
8. HubSpot mostrarà el **token d'accés**. Prem **Mostra el token** i després **Copia**.

## Resultat esperat

Tens al porta-retalls un token que comença per `pat-` (per exemple, `pat-eu1-xxxxxxxx`). Desa'l en un lloc segur de manera temporal; l'introduiràs a l'app al tutorial següent.

## Preguntes freqüents

**Puc canviar els scopes més tard?** Sí. Torna a l'aplicació privada, ajusta els àmbits i desa; HubSpot genera l'actualització sense canviar el token.

**On es desa el token a l'app?** Xifrat al keychain del teu sistema operatiu. Mai no es mostra en pantalla ni s'escriu als registres.

**Tinc un compte sandbox.** Repeteix aquests passos dins del portal sandbox per obtenir un token independent; l'usaràs a l'entorn *Sandbox* de l'app.
