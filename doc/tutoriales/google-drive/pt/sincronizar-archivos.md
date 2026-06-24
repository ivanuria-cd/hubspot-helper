# Sincronizar ficheiros

**Pré-requisitos:** conta Google ligada e pasta de trabalho selecionada.
**Tempo estimado:** 1 minuto.

## Passos

1. Abra **Configuração > Conetores > Google Drive**.
2. Na secção **Sincronização** verá a data da última sincronização.
3. Prima **Sincronizar** para trazer o estado atual dos ficheiros a partir do Google Drive.
4. Reveja a lista de **Ficheiros geridos**: cada ficheiro mostra o seu estado (Sincronizado, Em conflito ou Pendente).
5. Se aparecer um aviso de conflito, decida que versão conservar antes de continuar a trabalhar.

## Resultado esperado

A data da última sincronização é atualizada e cada ficheiro gerido mostra o seu estado. Se não houver conflitos, todos aparecem como **Sincronizado**.

## Perguntas frequentes

**Quando é que a aplicação sincroniza?**
Ao abrir o projeto, a aplicação contrasta o seu estado com o Google Drive, e pode forçar uma sincronização manual a qualquer momento com o botão **Sincronizar**, sem reiniciar a aplicação.

**Que versão prevalece se houver diferenças?**
O Google Drive é a fonte de verdade: se apenas a versão do Drive mudou, adota-se essa. Se a aplicação detetar que tinha alterações locais mais recentes, marca o ficheiro **Em conflito** e deixa-o decidir.

**O que significa o estado «Pendente»?**
Que a aplicação escreveu alterações que ainda não foram contrastadas com o Drive numa sincronização. Prima **Sincronizar** para o resolver.

**Posso editar os ficheiros diretamente no Google?**
Pode, mas respeite as zonas marcadas como geridas pela aplicação (a capa e o bloco de dados): a aplicação regenera-as e as suas edições manuais nessas zonas perder-se-iam.
