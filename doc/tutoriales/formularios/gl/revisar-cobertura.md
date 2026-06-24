# Revisar a cobertura dun formulario

**Prerrequisitos:** un formulario asociado a unha ou varias orixes (ver «Asociar un formulario a unha orixe»).
**Tempo estimado:** 2 minutos

A cobertura indica se un formulario contén todos os campos que a súa orixe esixe para un obxecto. Serve para detectar formularios incompletos antes de publicalos.

## Pasos

1. Entra en **CRM → Formularios**.
2. Observa o badge de cobertura de cada formulario na táboa.
3. Fai clic nun formulario para abrir o seu panel e ver o detalle por orixe: cantas propiedades se esperan, cantas están presentes e cales faltan.

## Entender os estados

- **completo** (badge lima): todos os campos que a/as orixe(s) definen están presentes no formulario.
- **faltan N** (badge con aviso): faltan N campos definidos pola orixe.
- **sen orixe** (badge gris): o formulario non está asociado a ningunha orixe, así que non se pode avaliar.

## Resultado esperado

No panel, cada propiedade esperada aparece marcada como presente ou como ausente. Se faltan campos, verás o botón **Engadir campos que faltan**.

## Preguntas frecuentes

**A cobertura calcúlase por obxecto?** Si. A comparación é por obxecto + nome técnico da propiedade; un campo doutro obxecto non conta.

**A cobertura mira os valores ou só a presenza do campo?** Só comproba que o campo (a propiedade destino) exista no formulario.
