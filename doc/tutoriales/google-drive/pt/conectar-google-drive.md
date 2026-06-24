# Ligar o Google Drive

**Pré-requisitos:** ter um projeto aberto na aplicação e uma conta Google.
**Tempo estimado:** 2 minutos.

## Passos

1. No menu lateral, abra **Configuração**.
2. Dentro de **Conetores**, prima **Google Drive**.
3. Prima o botão **Ligar com o Google**. Abrir-se-á o navegador do seu sistema com o ecrã de autorização do Google.
4. Escolha a conta Google que pretende usar para este projeto.
5. Reveja as permissões solicitadas e aceite. A aplicação só pede:
   — Acesso aos ficheiros que ela própria cria ou que você selecione (não a todo o seu Drive).
   — O seu endereço de correio, para mostrar com que conta está ligado.
6. Quando terminar, volte à aplicação. Verá o estado **Ligado** junto ao seu correio.

## Resultado esperado

O ecrã do Google Drive mostra «Ligado como o-seu-correio@exemplo.com» e surge a secção **Pasta de trabalho** para o passo seguinte.

## Perguntas frequentes

**Porque é que se abre o navegador e não uma janela dentro da aplicação?**
Por segurança e comodidade: assim autentica-se no navegador onde já tem a sessão do Google e a aplicação nunca vê a sua palavra-passe.

**A aplicação pode ver todos os meus ficheiros do Drive?**
Não. A permissão está restringida (`drive.file`): só pode ver e modificar os ficheiros que ela cria ou os que você escolher explicitamente.

**Onde fica guardado o acesso?**
As credenciais são armazenadas cifradas no porta-chaves do sistema operativo, nunca em texto simples nem no repositório.
