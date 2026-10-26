export class ConfiguracaoService {

    constructor() {
        this.chaves = {
            metaSemanal: 'meta_semanal_valor',
            semanaPadrao: 'config_semana_padrao',
            dataSemana: 'config_data_semana',
            formatoNumeros: 'config_formato_numeros',
            confirmacaoSalvar: 'config_confirmacao_salvar',
            valorUnitario: 'config_valor_unitario',
            custoFixoMensal: 'config_custo_fixo_mensal',
            retiradaSemanalDesejada: 'config_retirada_semanal_desejada',
            modoPlanejamentoFinanceiro: 'config_modo_planejamento_financeiro',
            modoCalculoFinanceiro: 'config_modo_calculo_financeiro',
            somLancamento: 'config_som_lancamento',
            somMeta: 'config_som_meta',
            confeteMeta: 'config_confete_meta'
        };

        this.padroes = {
            metaSemanal: 500.00,
            semanaPadrao: 'atual',
            dataSemana: '',
            formatoNumeros: 'milhar',
            confirmacaoSalvar: 'perguntar',
            valorUnitario: 0.21,
            custoFixoMensal: 0.00,
            retiradaSemanalDesejada: 0.00,
            modoPlanejamentoFinanceiro: 'meta_semanal',
            modoCalculoFinanceiro: 'liquido',
            somLancamento: true,
            somMeta: true,
            confeteMeta: true
        };
    }

    obter(chave) {
        const chaveStorage =
            this.chaves[chave];

        if (!chaveStorage) {
            throw new Error(
                `Configuração desconhecida: ${chave}`
            );
        }

        const valor =
            localStorage.getItem(chaveStorage);

        if (valor === null) {
            return this.padroes[chave];
        }

        if (
            chave === 'metaSemanal' ||
            chave === 'valorUnitario' ||
            chave === 'custoFixoMensal' ||
            chave === 'retiradaSemanalDesejada'
        ) {
            const numero =
                parseFloat(valor);

            return Number.isFinite(numero)
                ? numero
                : this.padroes[chave];
        }

        if (
            chave === 'somLancamento' ||
            chave === 'somMeta' ||
            chave === 'confeteMeta'
        ) {
            return valor === 'true';
        }

        return valor;
    }

    definir(chave, valor) {
        const chaveStorage =
            this.chaves[chave];

        if (!chaveStorage) {
            throw new Error(
                `Configuração desconhecida: ${chave}`
            );
        }

        localStorage.setItem(
            chaveStorage,
            String(valor)
        );

        // A configuração continua salva localmente primeiro. A aplicação pode
        // sincronizar a alteração com a nuvem sem bloquear a interface.
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('anotei:configuracao-alterada', {
                detail: { chave, valor }
            }));
        }

        return valor;
    }

    obterTodas() {
        const configuracoes = {};

        Object.keys(this.chaves)
            .forEach(chave => {
                configuracoes[chave] =
                    this.obter(chave);
            });

        return configuracoes;
    }

    definirTodas(configuracoes) {
        if (
            !configuracoes ||
            typeof configuracoes !== 'object' ||
            Array.isArray(configuracoes)
        ) {
            throw new Error(
                'Configurações inválidas.'
            );
        }

        Object.keys(configuracoes)
            .forEach(chave => {
                if (
                    Object.prototype.hasOwnProperty.call(
                        this.chaves,
                        chave
                    )
                ) {
                    this.definir(
                        chave,
                        configuracoes[chave]
                    );
                }
            });

        return this.obterTodas();
    }
}