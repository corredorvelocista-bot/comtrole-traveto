export class PlanejamentoFinanceiroService {
    normalizarNumero(valor) {
        const numero =
            typeof valor === "number"
                ? valor
                : Number.parseFloat(valor);

        return Number.isFinite(numero)
            ? Math.max(numero, 0)
            : 0;
    }

    calcular({
        modo = "meta_semanal",
        valorProduzido = 0,
        valorUnitario = 0,
        custoFixoSemanal = 0,
        custoVariavelSemanal = 0,
        retiradaSemanalDesejada = 0
    } = {}) {
        const modosValidos = [
            "meta_semanal",
            "valor_restante"
        ];

        const modoSeguro = modosValidos.includes(modo)
            ? modo
            : "meta_semanal";

        const produzido = this.normalizarNumero(valorProduzido);
        const valorPeca = this.normalizarNumero(valorUnitario);
        const custoFixo = this.normalizarNumero(custoFixoSemanal);
        const custoVariavel = this.normalizarNumero(custoVariavelSemanal);
        const retiradaDesejada =
            this.normalizarNumero(retiradaSemanalDesejada);

        const custosDespesas = custoFixo + custoVariavel;
        const saldoAposCustos = Math.max(
            produzido - custosDespesas,
            0
        );

        const valorAlvo = modoSeguro === "meta_semanal"
            ? retiradaDesejada
            : saldoAposCustos;

        const valorNecessario = modoSeguro === "meta_semanal"
            ? custosDespesas + retiradaDesejada
            : custosDespesas;

        const pecasEquilibrio = valorPeca > 0
            ? custosDespesas / valorPeca
            : 0;

        const pecasParaAlvo = valorPeca > 0
            ? valorNecessario / valorPeca
            : 0;

        return {
            modo: modoSeguro,
            valorProduzido: produzido,
            valorUnitario: valorPeca,
            custoFixoSemanal: custoFixo,
            custoVariavelSemanal: custoVariavel,
            custosDespesas,
            saldoAposCustos,
            retiradaSemanalDesejada: retiradaDesejada,
            valorRetiradaPlanejada: valorAlvo,
            valorNecessario,
            pecasPontoEquilibrio: pecasEquilibrio,
            pecasParaAlvo,
            pecasInteirasParaAlvo: Math.ceil(pecasParaAlvo)
        };
    }
}
