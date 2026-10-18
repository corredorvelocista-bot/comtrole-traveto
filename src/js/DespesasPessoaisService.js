export class DespesasPessoaisService {

    constructor() {
        this.chaveStorage = "despesas_pessoais";
    }

    obterTodas() {
        try {
            const dados =
                localStorage.getItem(
                    this.chaveStorage
                );

            if (!dados) {
                return [];
            }

            const despesas = JSON.parse(dados);

            return Array.isArray(despesas)
                ? despesas
                : [];
        } catch (erro) {
            console.error(
                "Erro ao carregar despesas pessoais:",
                erro
            );

            return [];
        }
    }

    salvar(despesas) {
        localStorage.setItem(
            this.chaveStorage,
            JSON.stringify(despesas)
        );
    }

    adicionar(despesa) {
        const despesas =
            this.obterTodas();

        const novaDespesa = {
            id: Date.now(),
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            semanaReferencia: despesa.semanaReferencia || null,
            valor: Number(despesa.valor) || 0,
            data: despesa.data,
            tipo: despesa.tipo,
            observacao: despesa.observacao || ""
        };

        despesas.push(novaDespesa);

        this.salvar(despesas);

        return novaDespesa;
    }

    remover(id) {
        const despesas =
            this.obterTodas();

        const restantes =
            despesas.filter(
                despesa => despesa.id !== id
            );

        this.salvar(restantes);

        return restantes;
    }

    limpar() {
        localStorage.removeItem(
            this.chaveStorage
        );
    }
}
