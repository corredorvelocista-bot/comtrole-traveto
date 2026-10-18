
export class ProducaoController {

    constructor() {

        this.chaveSemana =
            'semana_referencia_atual';

        this.chaveMetaBatida =
            'meta_batida_disparada';

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

        this.metaBatidaDisparada =
            localStorage.getItem(
                this.chaveMetaBatida
            ) === 'true';
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
        // A data escolhida identifica a semana de referência.
        // Ela não deve substituir a data real da produção diária.
        return lancamento;
    }

    metaJaFoiBatida() {

        return this.metaBatidaDisparada;
    }

    marcarMetaBatida() {

        this.metaBatidaDisparada =
            true;

        localStorage.setItem(
            this.chaveMetaBatida,
            'true'
        );
    }

    resetarMetaBatida() {

        this.metaBatidaDisparada =
            false;

        localStorage.setItem(
            this.chaveMetaBatida,
            'false'
        );
    }

    fecharSemana() {

        this.iniciarNovaSemana();

    }
}