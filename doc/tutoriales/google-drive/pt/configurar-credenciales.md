# Configurar as credenciais do Google

**Para que serve:** indicar à aplicação o **ID de cliente de OAuth** (e, se o seu cliente o exigir, o **segredo**) usados para ligar ao Google Drive. Antes isto residia apenas no ficheiro `.env`; agora pode fazê-lo a partir da própria aplicação.
**Tempo estimado:** 2 minutos.

## O que necessita do Google Cloud

Apenas o **ID de cliente de OAuth** do projeto do Google Cloud (um valor que termina em `.apps.googleusercontent.com`). Não é necessária nenhuma API key: o seletor de pasta da aplicação não usa o Google Picker.

> Se o seu cliente de OAuth for do tipo «App de ambiente de trabalho» e exigir segredo, tenha também à mão o **segredo de cliente**. Para clientes com PKCE normalmente não é necessário.

## Passos

1. Vá a **Configuração > Conetores > Google Drive**.
2. No cartão **Credenciais do Google Cloud**, cole o seu **ID de cliente** no campo correspondente.
3. (Opcional) Introduza o **segredo de cliente** se o seu cliente o exigir.
4. Prima **Guardar**. A alteração tem efeito imediato: não é preciso reiniciar.

## Origem de cada credencial

Cada campo mostra uma etiqueta com a sua origem:

- **App** — o valor está guardado na aplicação (o ID na configuração local; o segredo no porta-chaves do sistema operativo).
- **.env** — não há valor na aplicação e está a usar-se o do ficheiro `.env` como reserva.

O valor configurado na aplicação tem prioridade sobre o `.env`.

## Apagar credenciais

Prima **Apagar** para eliminar da aplicação o ID e o segredo. Se existir um valor em `.env`, a aplicação voltará a usá-lo automaticamente.

## Perguntas frequentes

**Onde fica guardado o segredo?**
No porta-chaves do sistema operativo (o mesmo local onde se guardam os tokens de acesso), nunca em texto simples. A aplicação só mostra se está configurado, sem revelar o seu valor.

**Porque é que já não se pede uma API key?**
A seleção de pasta usa um seletor próprio que navega no seu Drive apenas com OAuth. O Google Picker, que exigia API key, foi retirado.

**Mudei o ID de cliente e a conta continua ligada.**
A ligação existente mantém-se até que desligue. Se mudar de projeto do Google Cloud, desligue e volte a ligar para autorizar com as novas credenciais.
