# Connectar Google Drive

**Prerequisits:** tenir un projecte obert a l'app i un compte de Google.
**Temps estimat:** 2 minuts.

## Passos

1. Al menú lateral, obre **Configuració**.
2. Dins de **Connectors**, prem **Google Drive**.
3. Prem el botó **Connecta amb Google**. S'obrirà el navegador del sistema amb la pantalla d'autorització de Google.
4. Tria el compte de Google que vulguis usar per a aquest projecte.
5. Revisa els permisos sol·licitats i accepta. L'app només demana:
   — Accés als fitxers que ella mateixa crea o que tu seleccionis (no a tot el teu Drive).
   — La teva adreça de correu, per mostrar amb quin compte estàs connectat.
6. Quan acabis, torna a l'app. Veuràs l'estat **Connectat** al costat del teu correu.

## Resultat esperat

La pantalla de Google Drive mostra «Connectat com a el-teu-correu@exemple.com» i apareix la secció **Carpeta de treball** per al pas següent.

## Preguntes freqüents

**Per què s'obre el navegador i no una finestra dins de l'app?**
Per seguretat i comoditat: així t'autentiques al navegador on ja tens la sessió de Google i l'app mai no veu la teva contrasenya.

**L'app pot veure tots els meus fitxers de Drive?**
No. El permís està acotat (`drive.file`): només pot veure i modificar els fitxers que crea ella o els que tu triïs explícitament.

**On es desa l'accés?**
Les credencials s'emmagatzemen xifrades al keychain del sistema operatiu, mai en text pla ni al repositori.
