
export class ProducaoController {

    constructor() {

        this.chaveSemana =
            'semana_referencia_atual';

        const referenciaSalva =
            localStorage.getItem(
                this.chaveSemana
            );

        if (referenciaSalva) {

            this.semanaReferencia =
                referenciaSalva;

        } else {

            this.iniciarNovaSemana();
        }
    }

    criarReferenciaHoje() {

        return new Date()
            .toISOString()
            .slice(0, 10);
    }

    obterSemanaReferencia() {

        return this.semanaReferencia;
    }

    obterLancamentosDaSemana(
        lancamentos,
        configSemanaPadrao,
        configDataSemana
    ) {

        const referencia =
            configSemanaPadrao ===
                'escolhida' &&
                configDataSemana
                ? configDataSemana
                : this.obterSemanaReferencia();

        return lancamentos.filter(
            reg => {

                if (
                    !reg.semanaReferencia
                ) {
                    return (
                        configSemanaPadrao ===
                        'atual'
                    );
                }

                return (
                    reg.semanaReferencia ===
                    referencia
                );
            }
        );
    }

    definirSemanaDoLancamento(
        lancamento,
        configSemanaPadrao,
        configDataSemana
    ) {

        if (
            configSemanaPadrao ===
            'escolhida' &&
            configDataSemana
        ) {
            lancamento.semanaReferencia =
                configDataSemana;

            return lancamento;
        }

        lancamento.semanaReferencia =
            this.obterSemanaReferencia();

        return lancamento;
    }

    iniciarNovaSemana() {

        this.semanaReferencia =
            this.criarReferenciaHoje();

        localStorage.setItem(
            this.chaveSemana,
            this.semanaReferencia
        );

        return this.semanaReferencia;
    }

    definirDataDoLancamento(
        lancamento,
        texto,
        configSemanaPadrao,
        configDataSemana
    ) {

        if (
            texto.match(/\d{2}\/\d{2}/)
        ) {
            return lancamento;
        }

        if (
            configSemanaPadrao !==
            'escolhida' ||
            !configDataSemana
        ) {
            return lancamento;
        }

        const dataEscolhida =
            new Date(
                configDataSemana +
                'T00:00:00'
            );

        lancamento.data =
            dataEscolhida.toLocaleDateString(
                'pt-BR',
                {
                    day: '2-digit',
                    month: '2-digit'
                }
            );

        return lancamento;
    }

    fecharSemana() {

        this.iniciarNovaSemana();

    }
}