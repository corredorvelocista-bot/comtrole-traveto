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

    async montarPacoteCompleto() {

        const lancamentosAbertos =
            this.obterLancamentosAbertos();

        const semanasFechadas =
            await this.obterSemanasFechadas();

        const configuracoes = {
            metaSemanal:
                localStorage.getItem('meta_semanal_valor'),

            semanaPadrao:
                localStorage.getItem('config_semana_padrao'),

            dataSemana:
                localStorage.getItem('config_data_semana'),

            formatoNumeros:
                localStorage.getItem('config_formato_numeros'),

            confirmacaoSalvar:
                localStorage.getItem('config_confirmacao_salvar'),

            valorUnitario:
                localStorage.getItem('config_valor_unitario'),

            animacoes:
                localStorage.getItem('animacoes_interface'),

            tema:
                localStorage.getItem('tema_aparencia')
        };

        const perfil = {
            nome:
                localStorage.getItem('perfil_nome'),

            foto:
                localStorage.getItem('perfil_foto'),

            posicaoFoto:
                localStorage.getItem('perfil_foto_posicao')
        };

        return this.criarPacoteDados(
            lancamentosAbertos,
            semanasFechadas,
            configuracoes,
            perfil
        );
    }

    async enviarPacoteParaSupabase() {

        const usuario =
            await window.app.supabaseService
                .obterUsuarioAtual();

        if (!usuario) {
            console.error(
                'Usuário Supabase não encontrado.'
            );

            return false;
        }

        const pacote =
            await this.montarPacoteCompleto();

        return await window.app.supabaseService
            .salvarDadosUsuario(
                usuario.id,
                pacote
            );
    }

    async aplicarPacoteCompleto(pacote) {

    if (!pacote) {
        return false;
    }

    if (Array.isArray(pacote.lancamentosAbertos)) {
        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(
                pacote.lancamentosAbertos
            )
        );
    }

    if (pacote.configuracoes) {

        const configuracoes =
            pacote.configuracoes;

        const mapaConfiguracoes = {
            metaSemanal: 'meta_semanal_valor',
            semanaPadrao: 'config_semana_padrao',
            dataSemana: 'config_data_semana',
            formatoNumeros: 'config_formato_numeros',
            confirmacaoSalvar: 'config_confirmacao_salvar',
            valorUnitario: 'config_valor_unitario',
            animacoes: 'animacoes_interface',
            tema: 'tema_aparencia'
        };

        Object.entries(
            mapaConfiguracoes
        ).forEach(
            ([campo, chave]) => {

                if (
                    configuracoes[campo] !== null &&
                    configuracoes[campo] !== undefined
                ) {
                    localStorage.setItem(
                        chave,
                        configuracoes[campo]
                    );
                }
            }
        );
    }

    if (pacote.perfil) {

        const perfil =
            pacote.perfil;

        if (perfil.nome !== null) {
            localStorage.setItem(
                'perfil_nome',
                perfil.nome
            );
        }

        if (perfil.foto !== null) {
            localStorage.setItem(
                'perfil_foto',
                perfil.foto
            );
        }

        if (perfil.posicaoFoto !== null) {
            localStorage.setItem(
                'perfil_foto_posicao',
                perfil.posicaoFoto
            );
        }
    }

    if (Array.isArray(pacote.semanasFechadas)) {
        await this.aplicarSemanasRecebidas(
            pacote.semanasFechadas
        );
    }

    return true;
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

    obterLancamentosAbertos() {

        const dados =
            localStorage.getItem(
                'temp_lancamentos'
            );

        if (!dados) {
            return [];
        }

        try {

            return JSON.parse(dados);

        } catch {

            return [];
        }
    }

    async obterSemanasFechadas() {

        if (!window.app?.storage) {
            return [];
        }

        return await window.app.storage
            .obterTodasSemanas();
    }

    async salvarSemanaRecebida(semana) {

        if (!window.app?.storage) {
            throw new Error(
                'StorageService não está disponível.'
            );
        }

        await window.app.storage.salvarSemana(
            semana
        );
    }

    async aplicarSemanasRecebidas(semanas) {

        if (!Array.isArray(semanas)) {
            return;
        }

        const semanasLocais =
            await this.obterSemanasFechadas();

        const idsLocais =
            new Set(
                semanasLocais.map(
                    semana => semana.id
                )
            );

        for (const semana of semanas) {

            if (
                !idsLocais.has(semana.id)
            ) {

                await this.salvarSemanaRecebida(
                    semana
                );

                idsLocais.add(
                    semana.id
                );
            }
        }
    }

    aplicarLancamentosRecebidos(
        lancamentos
    ) {

        if (!Array.isArray(lancamentos)) {
            return;
        }

        const lancamentosLocais =
            this.obterLancamentosAbertos();

        const chavesLocais =
            new Set(
                lancamentosLocais.map(
                    lancamento =>
                        `${lancamento.data}|${lancamento.textoOriginal}|${lancamento.valorTotal}`
                )
            );

        for (const lancamento of lancamentos) {

            const chave =
                `${lancamento.data}|${lancamento.textoOriginal}|${lancamento.valorTotal}`;

            if (
                !chavesLocais.has(chave)
            ) {

                lancamentosLocais.push(
                    lancamento
                );

                chavesLocais.add(
                    chave
                );
            }
        }

        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(
                lancamentosLocais
            )
        );
    }
}