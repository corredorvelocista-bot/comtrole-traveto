# Sincronização explícita de configurações

Esta atualização acrescenta à página `migracao-dados.html` duas ações independentes:

- **Enviar configurações locais para a nuvem**: exige confirmação e usa `SupabaseRelacionalService.salvarConfiguracoes`, que chama a RPC de controle de versão para detectar conflitos.
- **Importar configurações da nuvem**: exige confirmação antes de alterar as configurações reconhecidas no navegador. Não altera lançamentos, semanas nem despesas locais.

As chaves existentes de `ConfiguracaoService` e seus valores padrão foram mantidos. As alterações feitas nas preferências da página principal agora disparam sincronização automática com debounce; a cópia local é salva primeiro e permanece intacta se a nuvem estiver indisponível. A página de migração continua oferecendo envio manual e importação explícita.

## Como usar

1. Faça backup da pasta atual do Anotei.
2. Substitua/mescle os arquivos deste pacote com a cópia local do projeto.
3. Confira as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente local.
4. Execute `npm run dev`, entre na conta e abra `migracao-dados.html`.
5. Clique em **Atualizar conferência** antes de sincronizar.
6. Escolha a direção desejada e confirme a ação.

A importação remota substitui apenas os valores locais cujas chaves são reconhecidas pelo serviço de configurações. Recomenda-se registrar os valores atuais antes de importar. Não foi executado SQL e não houve conexão com a conta Supabase durante a criação deste pacote.
