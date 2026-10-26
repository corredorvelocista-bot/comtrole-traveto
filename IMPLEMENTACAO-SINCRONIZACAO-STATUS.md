# Anotei — implementação e validação

## Implementado nesta versão

- Página `migracao-dados.html` com prévia dos dados locais, contagem dos registros, comparação com a conta autenticada e importação somente após confirmação.
- A importação não apaga nem limpa armazenamento local. Configurações remotas existentes são preservadas. Registros com IDs já encontrados são ignorados; falhas individuais são apresentadas no relatório.
- A importação lê lançamentos abertos, semanas do histórico (incluindo IndexedDB via `StorageService`), despesas e configurações existentes.
- O fluxo de importação grava semanas sem regravar automaticamente seus lançamentos aninhados; os lançamentos são comparados/importados separadamente.
- Conflitos de versão de configurações ficam bloqueados na fila para evitar repetição automática que sobrescreva silenciosamente a versão remota.
- A página de migração foi adicionada ao build do Vite e está acessível a partir da tela de perfil.

## Limites que exigem ambiente real

- A migração deve ser executada primeiro em projeto Supabase de desenvolvimento; este pacote não executa SQL por conta própria.
- Não foi possível confirmar aqui a autenticação e as políticas RLS contra o banco remoto do usuário.
- A integração automática com Google Sheets ainda depende de validar o fluxo existente, credenciais OAuth, escopo e política de atualização. Não considerar concluída sem teste real.
- O importador compara até 1000 registros por categoria na prévia. A gravação individual do serviço também verifica o ID de origem antes de upsert; para históricos muito grandes, recomenda-se paginação integral antes de declarar migração concluída.
