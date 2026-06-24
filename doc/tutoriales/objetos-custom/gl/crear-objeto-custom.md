# Crear un obxecto custom

**Prerrequisitos:** ter configurado o conector de HubSpot (polo menos un contorno) e ter aberto un proxecto.
**Tempo estimado:** 5–10 minutos

Os obxectos custom permítenche representar en HubSpot entidades propias do teu negocio (máquinas, contratos, vehículos…) que non encaixan nos obxectos estándar. Esta pantalla crea a **definición** do obxecto; os rexistros (instancias) xestiónanse despois en HubSpot.

## Pasos

1. No menú lateral, dentro de **CRM**, abre **Obxectos custom**.
2. Preme **Obxecto custom** para abrir o asistente de creación.
3. **Identidade**:
   - **Nome interno**: identificador técnico (só minúsculas, números e guións baixos; comeza por letra). **Non poderás cambialo despois.**
   - **Etiqueta singular** e **Etiqueta plural**: como se chamará o obxecto na interface (p. ex. «Máquina» / «Máquinas»).
   - **Descrición** (opcional): para que serve o obxecto.
4. **Propiedades iniciais**: engade as propiedades que terá o obxecto. Por cada unha indica **Nome interno** (identificador técnico), **Etiqueta**, **Tipo** e **Tipo de campo**. O **Tipo de campo** é un despregable que se axusta automaticamente ao tipo elixido (non tes que adiviñar o valor). Marca **Único** se esa propiedade identifica de forma unívoca cada rexistro. Usa **Engadir propiedade** para sumar máis.
5. **Visualización** (os despregables mostran a **etiqueta** de cada propiedade):
   - **Propiedade principal**: a propiedade que dá nome a cada rexistro (obrigatoria).
   - **Requiridas**, **Secundarias** e **Busca**: selecciona, entre as propiedades definidas, cales son obrigatorias, cales se mostran baixo o nome e cales se indexan para buscar.
6. **Asociacións** (opcional): elixe con que obxectos (contactos, empresas, outros custom) poderá relacionarse.
7. Preme **Gardar**. O obxecto engádese como **borrador** cun cambio pendente de tipo «crear».

## Resultado esperado

O obxecto aparece na lista con estado **borrador** (✕). Aínda non existe en HubSpot: para crealo, vai aos seus cambios pendentes e aplícao primeiro en sandbox e logo en produción (ver «Aplicar cambios de obxectos en HubSpot»).

## Preguntas frecuentes

**Por que non podo cambiar o nome interno logo?** É unha restrición de HubSpot: o nome é inmutable unha vez creado o obxecto. As etiquetas si se poden cambiar.

**Teño que crear todas as propiedades aquí?** Non. Podes crear o obxecto coas mínimas e engadir máis propiedades despois desde a pantalla de **Propiedades**.
