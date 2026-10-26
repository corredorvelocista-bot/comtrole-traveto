# Revisão do snapshot local contra o contrato de sincronização do Anotei

**Escopo:** revisão estática do contrato `CONTRATO_SINCRONIZACAO_ANOTEI.md`, do `SnapshotLocalService.js` entregue no patch seguro e dos serviços de sincronização presentes no `anotei-atual.zip`.

**Não houve gravação no Supabase nem alteração dos dados locais.** Esta revisão não executou a aplicação completa.

## 1. O que foi confirmado no navegador

A captura executada pelo usuário retornou:

- `schemaVersion: 1`
- 2 semanas fechadas
- 1 lançamento aberto (3.000 peças, valor unitário 0,21, total 630, data 2026-10-18)
- 2 despesas pessoais
- 13 configurações aplicadas e 13 configurações brutas
- 0 erros e 0 avisos no validador atual

Esses resultados demonstram que o snapshot consegue ler o estado atual testado. Não demonstram, por si só, que ele cumpre integralmente o contrato canônico nem que o banco está pronto para escrita.

## 2. Diferenças entre o snapshot e o contrato

| Área | Snapshot atual | Contrato canônico | Ajuste necessário antes da sincronização |
|---|---|---|---|
| Metadados | `metadados.capturadoEm`, `origem`, `modo` | `metadata.snapshotId`, `clientUpdatedAt`, `schemaVersion` | Definir nomes e gerar identificador de captura; manter horário do servidor como referência de commit. |
| Produção | `lancamentosAbertos` e `semanasFechadas` na raiz | `producao.lancamentosAbertos` e `producao.semanasFechadas` | Criar conversão explícita de formato, sem duplicar ou descartar os dados-base. |
| Perfil | `perfil.foto`, `perfil.posicaoFoto` | `perfil.fotoRef`, `perfil.fotoPosicao` | Adaptar nomes no contrato de saída sem modificar as chaves locais. Tratar data URL grande como bloqueio/aviso de tamanho, não apagá-la. |
| Aparência | `aparencia.animacoes` | `aparencia.animacoesAtivas` | Mapear o nome explicitamente e preservar o valor original. |
| Configurações | `configuracoes.valoresAplicados` e `valoresBrutos` | `configuracoes` canônico | Definir a forma remota. Não enviar dois mapas de forma permanente sem uma decisão de compatibilidade; preservar valores brutos para diagnóstico/migração se necessário. |
| Despesas | Objetos locais preservados, incluindo os campos existentes | `despesasPessoais` conserva todos os campos, inclusive legados | A saída deve manter os objetos e seus tipos sem normalização destrutiva. Testar registros heterogêneos. |
| Validação | Verifica formato de listas e alguns casos de leitura | Exige campos canônicos obrigatórios, versão, arrays e tipos válidos | Adicionar validação do documento canônico final e bloquear erros de leitura/estrutura. |

## 3. Estado da sincronização no código

`SupabaseSyncService.js` contém somente `lerResumoDadosRemotos()`. Ele autentica o usuário e lê `dados_usuario`, sem inserir, atualizar ou excluir registros. Portanto, não existe sincronização de escrita implementada nesse serviço.

O snapshot local também é somente leitura e retorna `prontaParaSincronizar: false`. Isso deve continuar assim até o adaptador canônico, a política de inicialização e os testes serem implementados.

## 4. Política para a primeira sincronização

O registro remoto previamente observado usa o formato legado (ex.: `perfil`, `configuracoes`, `lancamentosAbertos`, `semanasFechadas`) e não foi confirmado como documento canônico `schemaVersion: 1`.

Política segura recomendada:

1. Ler o registro remoto do usuário autenticado e guardar `atualizado_em`; não escrever.
2. Classificar qualquer documento sem `schemaVersion` canônica como **legado**, não como v1.
3. Preservar o documento legado exatamente como está; não fazer `upsert` cego nem substituí-lo pelo snapshot local.
4. Comparar o resumo local e o remoto e apresentar uma escolha explícita de migração/mesclagem depois de criar backup/exportação dos dois lados.
5. Se a decisão for inicializar o remoto com o estado local, converter o snapshot para o contrato canônico, validar o resultado, obter confirmação explícita e usar gravação condicional atômica com a versão remota esperada.
6. Após gravar, reler o registro e verificar a versão e o conteúdo persistidos.
7. Se `atualizado_em` mudar entre leitura e gravação, abortar e apresentar conflito. Não tentar novamente com um `upsert` incondicional.

A comparação de versão feita apenas no cliente não é suficiente para eliminar a corrida entre dispositivos. A gravação condicional precisa ser atômica no banco, por exemplo via RPC transacional.

## 5. Próximo trabalho de implementação

Antes de habilitar escrita remota:

1. Criar um adaptador puro `snapshot local -> documento canônico v1`.
2. Validar o documento canônico após a conversão, incluindo campos obrigatórios, tipos, serialização, IDs e campos legados.
3. Testar ida e volta JSON com o estado real confirmado no navegador, incluindo o lançamento aberto de 3.000 peças.
4. Implementar um diagnóstico remoto de somente leitura que classifique o registro como ausente, legado, v1 válido ou versão desconhecida.
5. Só depois implementar a inicialização explícita e a RPC condicional de gravação.

## 6. Limites desta revisão

- Não foram feitas escritas no Supabase.
- Não foram modificados arquivos do projeto original.
- Não foi executada uma compilação completa do aplicativo nesta revisão.
- O conteúdo do registro remoto deve ser lido novamente no momento da implementação; dados remotos e `atualizado_em` podem ter mudado desde o diagnóstico anterior.
