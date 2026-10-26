# Correção de sincronização Anotei

Alterações aplicadas:
- Reconciliação da lista principal com os registros remotos, preservando localmente somente itens ainda pendentes na fila.
- Assinatura Supabase Realtime para eventos da tabela `public.lancamentos_producao`.
- Atualização periódica de segurança a cada 5 segundos e ao voltar a ficar online.
- Edição preserva o ID original, para atualizar o registro remoto em vez de criar outro com ID diferente.
- Backup dos arquivos originais deve ser mantido antes de instalar no projeto local.

Importante:
- Para receber eventos Realtime, confirme no Supabase Dashboard que `lancamentos_producao` está habilitada em Database > Publications > supabase_realtime.
- O Supabase precisa permitir SELECT/INSERT/UPDATE/DELETE ao usuário autenticado pelas políticas RLS.
- A sincronização Realtime está implementada para `lancamentos_producao`; outras tabelas, como despesas e histórico de semanas, precisam de seus próprios eventos/fluxos para garantir propagação equivalente.
