# Contrato de dados para sincronização do Anotei — Etapa 2

**Objetivo:** definir o formato canônico e as regras de inicialização antes de implementar qualquer gravação no Supabase.

**Escopo desta etapa:** especificação. Este documento não altera o banco, não grava dados remotos e não modifica os arquivos do aplicativo.

## 1. Decisões fundamentais

1. O armazenamento local atual continua funcionando como antes nesta etapa.
2. O contrato remoto tem versão explícita (`schemaVersion`).
3. O snapshot representa dados-base do usuário, não relatórios ou cálculos derivados.
4. A primeira sincronização nunca escolhe automaticamente entre dados locais e remotos quando ambos existem.
5. Não apagar nem substituir dados locais durante login, logout ou inicialização.
6. Nunca aplicar um snapshot remoto sem validar usuário, versão, estrutura e integridade.
7. Dados desconhecidos/legados não são descartados silenciosamente durante normalização.
8. A chave `usuario_id` no banco precisa corresponder a `auth.uid()`; as políticas RLS continuam obrigatórias.

## 2. Documento canônico proposto

A tabela existente `dados_usuario` pode continuar usando um documento JSONB por usuário na primeira versão, desde que haja controle de concorrência. Estrutura proposta:

```json
{
  "schemaVersion": 1,
  "perfil": {
    "nome": null,
    "fotoRef": null,
    "fotoPosicao": null
  },
  "aparencia": {
    "tema": null,
    "tamanhoTexto": null,
    "animacoesAtivas": null
  },
  "configuracoes": {},
  "producao": {
    "lancamentosAbertos": [],
    "semanasFechadas": []
  },
  "despesasPessoais": [],
  "metadata": {
    "snapshotId": "uuid-gerado-no-cliente",
    "clientUpdatedAt": "ISO-8601 UTC",
    "schemaVersion": 1
  }
}
```

### Regras do contrato

- `schemaVersion`: inteiro obrigatório. A versão `1` é a primeira versão deste contrato; não significa que registros legados existentes já estejam nessa versão.
- `perfil`, `aparencia`, `configuracoes`, `producao`, `despesasPessoais` e `metadata` são obrigatórios no snapshot canônico. Valores ainda não configurados podem ser `null` ou usar o padrão já definido pelo serviço local, conforme o campo.
- `producao.lancamentosAbertos` é a representação serializada da chave local `temp_lancamentos`.
- `producao.semanasFechadas` é a lista retornada pelo `StorageService` do IndexedDB, usando o fallback legado apenas conforme as regras existentes.
- `despesasPessoais` conserva todos os campos encontrados em cada registro. Campos legados como `descricao`/`description`, `valor`/`value`, `data`/`dueDate` e `categoria`/`category` não são eliminados nesta versão.
- IDs locais numéricos não devem ser convertidos silenciosamente para strings, nem IDs string para números. Se a comparação exigir uma chave normalizada, ela deve existir à parte e não substituir o ID original.
- Datas originais são preservadas. Não inventar ano para valores como `DD/MM`.
- Os relatórios e os resultados da gestão financeira são recalculados no dispositivo a partir dos dados-base; não são fonte de verdade do snapshot.
- A foto do perfil não deve ser copiada indefinidamente como uma grande data URL no JSONB. `fotoRef` fica reservado para uma referência; a migração da foto para Supabase Storage precisa ser uma etapa separada, testada e aprovada.
- `snapshotId` identifica uma captura, não uma pessoa nem uma linha de produção.

## 3. Mapa de origem local

| Campo canônico | Origem local atual |
|---|---|
| `perfil.nome` | `localStorage['perfil_nome']` |
| `perfil.fotoRef` | `localStorage['perfil_foto']` — provisório; pode ser data URL legada |
| `perfil.fotoPosicao` | JSON em `localStorage['perfil_foto_posicao']` |
| `aparencia.tema` | `localStorage['tema_aparencia']` |
| `aparencia.tamanhoTexto` | `localStorage['tamanho_texto']` |
| `aparencia.animacoesAtivas` | `localStorage['animacoes_ativas']` |
| `configuracoes` | Configurações descritas abaixo |
| `producao.lancamentosAbertos` | `localStorage['temp_lancamentos']` |
| `producao.semanasFechadas` | IndexedDB `TraveteDB`, store `semanas`; fallback legado `historico_semanas` conforme serviço existente |
| `despesasPessoais` | `localStorage['despesas_pessoais']` |

### Configurações a incluir

- `metaSemanal` (`meta_semanal_valor`)
- `semanaPadrao` (`config_semana_padrao`)
- `dataSemana` (`config_data_semana`)
- `formatoNumeros` (`config_formato_numeros`)
- `confirmacaoSalvar` (`config_confirmacao_salvar`)
- `valorUnitario` (`config_valor_unitario`)
- `custoFixoMensal` (`config_custo_fixo_mensal`)
- `retiradaSemanalDesejada` (`config_retirada_semanal_desejada`)
- `modoPlanejamentoFinanceiro` (`config_modo_planejamento_financeiro`)
- `modoCalculoFinanceiro` (`config_modo_calculo_financeiro`)
- `somLancamento` (`config_som_lancamento`)
- `somMeta` (`config_som_meta`)
- `confeteMeta` (`config_confete_meta`)

Os nomes das chaves locais não serão renomeados por causa do contrato remoto.

## 4. Metadados de concorrência

O documento remoto deve continuar usando a coluna de servidor `atualizado_em` como relógio de referência do último commit confirmado. `metadata.clientUpdatedAt` é informativo e não substitui o relógio do servidor.

Para a primeira versão, antes de qualquer escrita:

1. Ler o registro remoto e o `atualizado_em` atual.
2. Guardar esse valor como versão-base observada.
3. Antes de gravar, confirmar que o registro não mudou desde a leitura (comparação otimista, idealmente numa função SQL/RPC transacional que verifica a versão esperada).
4. Se mudou, interromper e sinalizar conflito; não fazer `upsert` cego do documento inteiro.
5. Após a gravação, reler e confirmar que a versão e o conteúdo persistidos correspondem ao snapshot enviado.

Uma comparação feita somente no navegador entre leitura e escrita não elimina completamente a corrida entre dois clientes. Para garantia forte, a operação condicional deve ser atômica no banco (por exemplo, RPC que recebe a versão esperada e retorna conflito se ela não corresponder).

## 5. Política obrigatória para a primeira sincronização

A inicialização deve ser explícita e apresentar uma escolha clara se houver dados nos dois lados. A aplicação não deve escolher por “mais recente” usando relógio do dispositivo nem substituir um lado silenciosamente.

| Estado encontrado | Comportamento permitido |
|---|---|
| Local com dados, remoto inexistente | Preparar backup local e propor inicializar o remoto com o snapshot local validado. Só gravar após confirmação explícita. |
| Local vazio, remoto com contrato `schemaVersion: 1` válido | Oferecer restaurar remoto para o dispositivo após backup do estado local vazio/atual e confirmação. Não executar durante login sem aviso. |
| Local e remoto com dados | Declarar conflito de inicialização. Preservar ambos e oferecer escolha explícita ou ferramenta de comparação/mesclagem. Não sobrescrever automaticamente. |
| Remoto com formato legado sem `schemaVersion` | Classificar como legado; não aplicar como contrato v1. Preservar o registro e exigir migração controlada ou decisão explícita. |
| Remoto com versão maior que a suportada | Não gravar nem tentar rebaixar. Informar que a versão do app não entende o formato remoto. |
| Snapshot local inválido ou incompleto | Bloquear a gravação e mostrar erros de validação; não “consertar” removendo dados sem autorização. |
| Usuário autenticado diferente do dono do snapshot | Bloquear a operação. Nunca transferir dados de uma conta para outra. |

**Regra de conta:** login e logout, por si só, nunca importam, apagam ou sincronizam dados locais. Antes de permitir que o mesmo navegador seja usado por contas diferentes, é necessário isolamento local por usuário ou um fluxo de troca de conta que preserve e separe os dados explicitamente.

## 6. Validação antes de aceitar um snapshot

- Confirmar que o snapshot é um objeto JSON serializável.
- Confirmar `schemaVersion` suportada.
- Confirmar a presença das seis áreas obrigatórias.
- Confirmar que `lancamentosAbertos`, `semanasFechadas` e `despesasPessoais` são arrays.
- Confirmar que cada semana e lançamento é um objeto; preservar campos extras.
- Validar valores numéricos quando usados em cálculos, mas não substituir silenciosamente valores inválidos por zero.
- Preservar os IDs e datas originais.
- Medir tamanho serializado e alertar antes de tentar gravar snapshots excessivamente grandes, especialmente se a foto ainda for uma data URL.
- Distinguir erro de leitura, aviso de campo legado e erro que bloqueia a gravação.

## 7. Regras de mesclagem — ainda não habilitadas

A versão 1 não fará mesclagem automática de snapshots completos. Uma mesclagem futura precisa de regras por entidade:

- configurações e perfil: detectar alteração concorrente e solicitar escolha se ambos mudaram;
- semanas fechadas: usar identidade estável validada e detectar duplicidades; não confiar apenas no `periodo`;
- lançamentos abertos: não deduplicar apenas por conteúdo ou data;
- despesas: preservar IDs e campos desconhecidos e resolver aliases sem apagar valores originais;
- datas ambíguas: nunca inferir ano;
- exclusões: precisam de representação explícita (tombstone ou log de mudanças) para que uma exclusão não reapareça ao sincronizar.

Até que essas regras sejam implementadas e testadas, o comportamento seguro em conflito é parar e preservar os dois lados.

## 8. Testes de aceitação antes de habilitar escrita

1. Snapshot de armazenamento vazio gera arrays vazios e configurações padrão sem escrever no banco.
2. Snapshot com semanas, lançamentos, despesas, perfil e configurações mantém contagens e conteúdo após serializar e desserializar.
3. Despesas com campos legados preservam aliases, tipos e campos extras.
4. Datas `DD/MM` continuam exatamente como recebidas.
5. Foto grande gera aviso de tamanho; não é removida automaticamente.
6. Documento remoto legado não é tratado como v1.
7. Versão remota desconhecida bloqueia gravação.
8. Dois clientes que leem a mesma versão: o segundo commit deve receber conflito após o primeiro alterar o documento.
9. Login/logout não apaga nem importa dados locais automaticamente.
10. Falha de rede mantém os dados locais intactos.
11. RLS impede usuário A de ler ou alterar o registro do usuário B.
12. `npm run build` continua passando e as páginas existentes permanecem funcionais.

## 9. Fora do escopo desta etapa

- Não executar `insert`, `update` ou `upsert` no Supabase.
- Não aplicar o documento legado remoto.
- Não migrar nem renomear chaves do `localStorage`.
- Não alterar o IndexedDB.
- Não ativar sincronização automática em eventos da interface.
- Não substituir os serviços existentes de backup/restauração.
- Não alterar a configuração `.env.local`.

## 10. Critério de saída da etapa 2

A etapa 2 só está concluída quando o contrato for aceito e a etapa seguinte implementar a captura local compatível com ele, seguida de testes de validação. A escrita remota continua bloqueada até haver uma política de inicialização testada e uma operação de gravação com controle de concorrência.
