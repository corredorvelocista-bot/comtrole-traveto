# Alterações da Gestão Financeira

## Escopo desta versão
- Substituída a apresentação antiga dos indicadores pelo modelo de quatro cards aprovado.
- Incluída a escolha entre usar o valor total produzido ou descontar as despesas consideradas na semana.
- A escolha é salva em `localStorage` pela chave `config_modo_calculo_financeiro` e permanece após recarregar a página.
- Os cards leem o valor da produção atual e as despesas do mês a partir dos dados já usados pelo aplicativo.
- Mantidas a seção de evolução das semanas e a seção-resumo de despesas com o botão “Ver despesas”.
- Os registros de produção e despesas não são regravados nem migrados por esta alteração.
- O CSS novo está isolado em `src/css/gestao-financeira.css`.

## Verificação
- `node --check` passou para `src/js/index.js`, `src/js/app.js` e `src/js/ConfiguracaoService.js`.
- `npm run build` passou com Vite 8.3.0.

## Observação sobre os cálculos
A estimativa usa a produção da semana atual como referência e soma as despesas registradas no mês atual. O modo “Descontar as despesas registradas” desconta do valor semanal os custos que o cálculo financeiro atual do Anotei associa à semana. A previsão pressupõe que o ritmo semanal se mantenha e não considera outras retiradas futuras.
