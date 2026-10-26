# Integração com Google Planilhas — etapa inicial

## O que foi implementado

- A página `migracao-dados.html` ganhou a seção **Google Planilhas**, abaixo de **Sincronizar configurações**.
- O usuário conecta sua conta Google usando Google Identity Services.
- A integração identifica o usuário autenticado no Anotei pelo ID do Supabase e usa esse ID no nome da planilha: `Anotei - <ID do usuário>`.
- A planilha tem duas abas: `Produção` e `Despesas`.
- A aba `Produção` contém `Data`, `Descrição`, `Quantidade`, `Valor unitário` e `Valor calculado`.
- A aba `Despesas` contém `Data`, `Descrição`, `Valor`, `Situação` e `Categoria`.
- A sincronização automática é iniciada ao abrir o Anotei se a conta Google já foi conectada; observa alterações de produção e despesas pelo Supabase Realtime e faz uma verificação periódica a cada cinco minutos enquanto o app está aberto.
- O botão **Conferir e sincronizar agora** força uma sincronização completa para conferir se nenhum dado ficou de fora.
- O botão **Abrir minha planilha** abre a planilha do usuário atual.
- O ID é guardado por usuário Anotei neste navegador. Em outro dispositivo, a integração procura no Google Drive a planilha cujo nome inclui o mesmo ID de usuário; é necessário conectar a mesma conta Google.

## Limites desta etapa

A sincronização automática funciona enquanto o Anotei estiver aberto em uma página que carrega `app.js`, com conexão Google previamente autorizada e token válido. Na página **Migração de dados**, o botão força uma sincronização completa. Se o token Google expirar ou o usuário revogar o acesso, será necessário reconectar a conta. A sincronização não pode executar no navegador quando o Anotei está totalmente fechado; isso exigiria um serviço de servidor com autorização Google persistente. O acesso ao Google depende de o OAuth Client ID configurado no código estar autorizado para o domínio onde o Anotei é executado.

A situação da despesa usa o campo de situação/status disponível no registro, quando houver. Se nenhum campo de pagamento estiver gravado nos dados, a planilha exibirá `Pendente` como valor padrão. A sincronização não altera nem exclui registros do Supabase.

## Arquivos alterados

- `migracao-dados.html`
- `src/js/migracao-dados.js`
- `src/js/GoogleService.js`
- `src/js/GoogleAutoSync.js`
