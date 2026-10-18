export class GestaoFinanceiraService {

    calcular({
        custoFixoMensal = 0,
        retiradaSemanalDesejada = 0,
        valorUnitario = 0,
        metaSemanal = 0,
        pecasProduzidas = 0
    }) {
        const custoMensal =
            this.normalizarNumero(custoFixoMensal);

        const retirada =
            this.normalizarNumero(
                retiradaSemanalDesejada
            );

        const valorPeca =
            this.normalizarNumero(valorUnitario);

        const meta =
            this.normalizarNumero(metaSemanal);

        const pecas =
            this.normalizarNumero(pecasProduzidas);

        const custoFixoSemanal =
            custoMensal / 4;

        const valorProduzido =
            pecas * valorPeca;

        const pecasPontoEquilibrio =
            valorPeca > 0
                ? custoFixoSemanal / valorPeca
                : 0;

        const pecasRetirada =
            valorPeca > 0
                ? retirada / valorPeca
                : 0;

        const valorAposEquilibrio =
            Math.max(
                valorProduzido -
                custoFixoSemanal,
                0
            );

        const excedente =
            Math.max(
                valorProduzido -
                custoFixoSemanal -
                retirada,
                0
            );

        const diferencaRetirada =
            Math.max(
                retirada -
                valorAposEquilibrio,
                0
            );

        // A meta semanal existente no aplicativo
        // representa um valor em dinheiro.
        const valorRestanteMeta =
            Math.max(
                meta -
                valorProduzido,
                0
            );

        const pecasRestantesMeta =
            valorPeca > 0
                ? valorRestanteMeta / valorPeca
                : 0;

        const percentualMeta =
            meta > 0
                ? Math.min(
                    (valorProduzido / meta) * 100,
                    100
                )
                : 0;

        return {
            custoFixoMensal: custoMensal,
            custoFixoSemanal,
            retiradaSemanalDesejada: retirada,
            valorUnitario: valorPeca,
            metaSemanal: meta,
            pecasProduzidas: pecas,
            valorProduzido,
            pecasPontoEquilibrio,
            pecasRetirada,
            valorAposEquilibrio,
            excedente,
            diferencaRetirada,
            valorRestanteMeta,
            pecasRestantesMeta,
            percentualMeta
        };
    }

    normalizarNumero(valor) {
        const numero =
            typeof valor === 'number'
                ? valor
                : parseFloat(valor);

        return Number.isFinite(numero)
            ? Math.max(numero, 0)
            : 0;
    }
}