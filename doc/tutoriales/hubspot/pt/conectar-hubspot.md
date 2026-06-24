# Ligar a aplicação ao HubSpot

**Pré-requisitos:** ter um token de aplicação privada (ver *Criar uma Private App no HubSpot e obter o token*) e um projeto criado na aplicação.
**Tempo estimado:** 2 minutos.

## Passos

1. Abra o seu projeto na aplicação.
2. No menu lateral, prima **Configuração**.
3. Na secção **Conetores**, prima **HubSpot**.
4. Certifique-se de que tem selecionado o separador do ambiente que pretende configurar: **Produção** ou **Sandbox**.
5. Cole o token no campo **Private App Token**.
6. Prima **Guardar**.

A aplicação verifica o token contra o HubSpot e, se for válido, mostra o estado da ligação.

## Resultado esperado

- Um indicador **Ligado** (badge verde lima).
- A linha **Portal: _nome_ (_id_)** com os dados da sua conta HubSpot.
- A **versão da API** em uso.

Se o token não for válido, verá uma mensagem de erro a explicar o motivo e a ligação não será guardada.

> **Sobre as permissões (scopes):** a aplicação não mostra os scopes do token. As chaves privadas do HubSpot não permitem consultar os seus âmbitos via API, pelo que a aplicação não os pode listar. Reveja e ajuste os scopes diretamente no HubSpot, dentro da aplicação privada (ver *Criar uma Private App no HubSpot e obter o token*). Se a uma função faltar uma permissão, irá notá-lo ao usá-la, não neste ecrã.

## Perguntas frequentes

**O meu token fica visível nalgum sítio?** Não. O campo é do tipo palavra-passe, o token é guardado cifrado no porta-chaves do sistema e é ocultado (`[REDACTED]`) em qualquer registo.

**Como desligo o portal?** No mesmo ecrã, com o ambiente selecionado, prima **Revogar**. Elimina-se o token desse ambiente.

**O que acontece se o token expirar ou se eu o mudar?** Volte a colar o novo token e prima **Guardar**; a aplicação revalida e atualiza os dados do portal.
