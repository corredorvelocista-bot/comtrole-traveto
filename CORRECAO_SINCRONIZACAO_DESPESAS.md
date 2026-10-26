# Correção da sincronização do Anotei

## O que foi corrigido

O projeto apontava a sincronização relacional para `public.despesas_pessoais`, mas essa tabela já existia no banco com um esquema legado sem `usuario_id`. Para não modificar nem atribuir proprietários aos registros antigos de forma insegura, a sincronização relacional agora usa `public.anotei_despesas_pessoais`.

A tabela local do navegador continua usando a chave `despesas_pessoais`; somente a tabela remota relacional mudou. Lançamentos, semanas e configurações continuam usando os nomes de tabelas já definidos.

## Aplicação necessária no Supabase

1. Abra o painel do Supabase do projeto usado pelo Anotei.
2. Entre em SQL Editor.
3. Abra e execute o conteúdo de `supabase/migrations/20261025000100_anotei_despesas_relacional.sql`.
4. Aguarde a execução bem-sucedida. A migração cria uma tabela nova e não altera nem apaga a tabela antiga.

## Teste

Na pasta `anotei`, execute `npm install`, `npm run build` e `npm run dev`. Abra `migracao-dados.html`, entre na conta e clique em `Atualizar conferência`. Como o app foi zerado intencionalmente, os totais locais de lançamentos/semanas/despesas podem ser 0; as 13 configurações locais são esperadas. A conferência deve terminar sem o erro `despesas_pessoais.usuario_id does not exist`.

Depois, teste `Enviar configurações locais para a nuvem`, confirme a ação e veja se a mensagem mostra uma versão remota. Para verificar persistência, atualize a conferência e confirme que as configurações existem na nuvem. A importação de configurações é separada e só deve ser testada quando necessário.

Nenhuma conexão real com a conta do usuário foi possível neste ambiente; o teste remoto final deve ser executado no navegador autenticado.
