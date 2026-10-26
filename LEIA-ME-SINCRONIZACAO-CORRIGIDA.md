# Anotei — sincronização corrigida

## Alterações
- Preferências alteradas na página principal são salvas primeiro no navegador e enviadas automaticamente ao Supabase após uma pausa curta.
- Se a rede ou a sessão falhar, os dados locais permanecem intactos; o erro fica visível no console e o envio manual continua disponível em `migracao-dados.html`.
- A sincronização de configurações usa a RPC `anotei_salvar_configuracoes_condicional` com controle de versão.
- Despesas relacionais usam `anotei_despesas_pessoais`, sem depender da tabela legada `despesas_pessoais`.
- Mantidas as chaves de configurações locais existentes.

## Aplicar sem perder a configuração local
1. Extraia este projeto em uma pasta nova.
2. Copie o seu arquivo `.env.local` atual para a pasta `anotei` extraída. O pacote não inclui credenciais.
3. Na pasta do projeto, execute `npm install` e `npm run dev`.
4. Entre na conta do Anotei.
5. Altere uma preferência na página principal e aguarde alguns segundos.
6. No Supabase SQL Editor, confirme a gravação com:

```sql
SELECT usuario_id, valores, versao, atualizado_em
FROM public.configuracoes_usuario
ORDER BY atualizado_em DESC;
```

## Migrações Supabase
As migrações SQL estão em `supabase/migrations/`. A migração de despesas relacionais deve ser aplicada no Supabase, como foi orientado anteriormente. Este pacote não executa SQL remotamente.

## Verificação feita
`node node_modules/vite/bin/vite.js build` concluiu com sucesso neste ambiente. A gravação remota real precisa ser confirmada no Supabase da conta do usuário, pois este ambiente não tem acesso à sessão autenticada dessa conta.
