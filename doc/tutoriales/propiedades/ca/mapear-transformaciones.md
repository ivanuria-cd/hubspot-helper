# Mapejar orígens i transformacions

**Prerequisits:** tenir com a mínim una propietat al mapa i un origen creat.
**Temps estimat:** 7 minuts

Un mapeig connecta una propietat amb un origen de dades, indicant de quin camp del sistema d'origen procedeix i quines transformacions de valors cal aplicar perquè encaixin a HubSpot.

## Passos

1. Entra a **CRM → Propietats** i fes clic sobre la propietat que vulguis mapejar. S'obre el plafó lateral.
2. A la secció **Orígens mapejats**, prem **Afegeix origen**.
3. Al diàleg «Mapeja origen»:
   - **Origen**: tria l'origen de dades.
   - **Camp origen**: el nom del camp al sistema d'origen, per exemple `Account_Tier__c`.
   - **Transformacions**: prem **Afegeix regla** per cada equivalència de valor. A l'esquerra el valor tal com arriba de l'origen, a la dreta el valor vàlid a HubSpot. Per exemple `GOLD → enterprise`.
   - **Notes** (opcional): qualsevol aclariment per a l'equip.
4. Prem **Desa**. El mapeig apareix al plafó i a la columna «Orígens» de la taula.
5. Per editar o eliminar un mapeig, usa les icones de llapis i paperera al seu costat al plafó.

## Resultat esperat

El mapeig queda desat i es reflecteix al full `03_Mapeo_Origenes` del Google Sheets. Les transformacions s'emmagatzemen com a parells valor origen → valor HubSpot, a punt per exportar-se al contracte JSON de l'origen.

## Preguntes freqüents

**Puc definir lògica complexa a les transformacions?** No. Per seguretat només s'admeten equivalències de valor (mapejos), mai scripts.

**Una propietat pot tenir diversos orígens?** Sí. Afegeix un mapeig per cada origen que alimenti aquella propietat.
