# Exportar JSON por orixe

**Prerrequisitos:** ter polo menos unha orixe con propiedades mapeadas.
**Tempo estimado:** 2 minutos

A exportación xera un ficheiro JSON coas propiedades asociadas a unha orixe, incluíndo o campo orixe e as regras de transformación. É un contrato de integración pensado para que o equipo de desenvolvemento saiba exactamente que enviar a HubSpot e como transformar cada valor.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Preme **Exportar JSON**. Desprégase un menú cun elemento por cada orixe do proxecto.
3. Selecciona a orixe que queiras exportar.
4. O navegador descarga un ficheiro co nome `{nombre-origen}_{fecha}.json`.

## Que contén o ficheiro

- `schema_version`: versión do contrato (actualmente 1).
- `origin`: identificador, nome e tipo da orixe.
- `exported_at`: data e hora da exportación.
- `properties`: para cada propiedade mapeada a esa orixe, o seu nome técnico, etiqueta, obxecto, tipo, campo orixe e as transformacións (valor orixe → valor HubSpot).

## Resultado esperado

Un ficheiro JSON descargado, listo para compartir co equipo de desenvolvemento ou achegar á documentación da integración.

## Preguntas frecuentes

**Gárdase o JSON en Google Drive?** Non. A exportación xérase baixo demanda e descárgase localmente; non se almacena automaticamente en Drive.

**Por que exportar por orixe e non todo xunto?** Cada orixe adoita corresponder a unha integración distinta; o contrato por orixe é xustamente o que necesita quen desenvolve esa integración.
