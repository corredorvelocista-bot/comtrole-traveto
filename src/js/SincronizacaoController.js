export class SincronizacaoController {

    constructor() {

        this.chaveDados =
            'dados_sincronizacao';

    }

    criarPacoteDados(
        lancamentosAbertos,
        semanasFechadas,
        configuracoes,
        perfil
    ) {

        return {
            lancamentosAbertos,
            semanasFechadas,
            configuracoes,
            perfil
        };
    }

    salvarPacoteDados(pacote) {

    localStorage.setItem(
        this.chaveDados,
        JSON.stringify(pacote)
    );
}

obterPacoteDados() {

    const dados =
        localStorage.getItem(
            this.chaveDados
        );

    if (!dados) {
        return null;
    }

    try {

        return JSON.parse(dados);

    } catch {

        return null;
    }
}

}