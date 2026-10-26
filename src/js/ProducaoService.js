// ProducaoService.js - Responsável por regras de negócio e processamento de dados
export class ProducaoService {
    
    static processarDadosSemana(lancamentosAtuais, producaoController, configSemanaPadrao, configDataSemana, termoBusca, mostrarTodosLancamentos, mostrarTodosResumo) {
        
        // 1. Obtém lançamentos da semana
        const lancamentosDaSemana = producaoController.obterLancamentosDaSemana(
            lancamentosAtuais,
            configSemanaPadrao,
            configDataSemana
        );

        // 2. Filtra por termo de busca
        const lancamentosFiltrados = lancamentosDaSemana.filter(reg => {
            const textoBuscaRef = (reg.textoBruto || reg.textoOriginal || '').toLowerCase();
            const dataRef = (reg.data || '').toLowerCase();
            if (termoBusca && !dataRef.includes(termoBusca) && !textoBuscaRef.includes(termoBusca)) {
                return false;
            }
            return true;
        });

        // 3. Totais gerais
        let totalPecas = 0;
        let totalValor = 0;
        lancamentosFiltrados.forEach(reg => {
            totalPecas += Number(reg.pecas) || 0;
            totalValor += Number(reg.valorTotal) || 0;
        });

        // 4. Agrupamento por preço unitário para o Resumo
        const gruposPorPreco = {};
        let totalLancamentosGeral = 0;

        lancamentosDaSemana.forEach(reg => {
            const valorUnitario = Number(reg.valorUnitario) || 0.21;
            const chave = valorUnitario.toFixed(2);

            if (!gruposPorPreco[chave]) {
                gruposPorPreco[chave] = {
                    valorUnitario,
                    pecas: 0,
                    valor: 0,
                    lancamentos: []
                };
            }

            const pecas = Number(reg.pecas) || 0;
            const valorTotal = Number(reg.valorTotal) || (pecas * valorUnitario);

            gruposPorPreco[chave].pecas += pecas;
            gruposPorPreco[chave].valor += valorTotal;

            gruposPorPreco[chave].lancamentos.push({
                data: reg.data || '',
                pecas,
                valorTotal,
                texto: reg.textoBruto || reg.textoOriginal || ''
            });

            totalLancamentosGeral++;
        });

        const chavesPreco = Object.keys(gruposPorPreco).sort((a, b) => Number(a) - Number(b));

        return {
            lancamentosDaSemana,
            lancamentosFiltrados,
            totais: { totalPecas, totalValor },
            gruposPorPreco,
            chavesPreco,
            totalLancamentosGeral
        };
    }
}