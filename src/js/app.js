import {
    StorageService
} from './StorageService.js';
import {
    LancamentoDia,
    SemanaProducao
} from './Producao.js';
import {
    tocarSomLancamento,
    tocarSomMetaBatida,
    dispararAnimacaoMetaBatida
} from './efeitos.js';
import {
    MenuController
} from './menu/MenuController.js';
import {
    PerfilController
} from './PerfilController.js';
import {
    ProducaoController
} from './ProducaoController.js';
import {
    ProducaoService
} from './ProducaoService.js';
import {
    UIRenderer
} from './UIRenderer.js';

import './GlobalAparenciaController.js';

import {
    ConfiguracaoService
} from './ConfiguracaoService.js';
import {
    GestaoFinanceiraService
} from './GestaoFinanceiraService.js';
import {
    PlanejamentoFinanceiroService
} from './PlanejamentoFinanceiroService.js';
import {
    DespesasPessoaisService
} from './DespesasPessoaisService.js';


class AppController {

    constructor() {
        this.mostrarTodosLancamentos = false;
        this.mostrarTodosResumo = false;

        // =====================================================
        // ESTADO INICIAL
        // =====================================================

        this.storage =
            new StorageService();

        this.menuController =
            new MenuController();

        this.perfilController =
            new PerfilController();

        this.producaoController =
            new ProducaoController();

        this.configuracaoService =
            new ConfiguracaoService();

        this.gestaoFinanceiraService = new GestaoFinanceiraService();
        this.planejamentoFinanceiroService =
            new PlanejamentoFinanceiroService();

        this.despesasPessoaisService =
            new DespesasPessoaisService();

        this.termoBusca =
            '';

        this.lancamentosAtuais =
            this.storage.obterLancamentosTemporarios();

        // =====================================================
        // CONFIGURAÇÕES
        // =====================================================

        const configuracoes =
            this.configuracaoService.obterTodas();

        this.metaSemanal =
            configuracoes.metaSemanal;

        this.configSemanaPadrao =
            configuracoes.semanaPadrao;

        this.configDataSemana =
            configuracoes.dataSemana;

        this.configFormatoNumeros =
            configuracoes.formatoNumeros;

        this.configConfirmacaoSalvar =
            configuracoes.confirmacaoSalvar;

        this.configValorUnitario =
            configuracoes.valorUnitario;

        this.configSomLancamento =
            configuracoes.somLancamento;

        this.custoFixoMensal =
            configuracoes.custoFixoMensal;

        this.retiradaSemanalDesejada =
            configuracoes.retiradaSemanalDesejada;

        this.modoPlanejamentoFinanceiro =
            configuracoes.modoPlanejamentoFinanceiro || 'meta_semanal';

        this.configSomMeta =
            configuracoes.somMeta;

        this.configConfeteMeta =
            configuracoes.confeteMeta;

        // =====================================================
        // DISPONIBILIZA APP GLOBALMENTE
        // =====================================================
        window.app =
            this;

        // =====================================================
        // INICIALIZAÇÃO
        // =====================================================

        this.initEvents();
        this.atualizarPerfilMenu();
        this.render();
    }

    // =====================================================
    // UTILITÁRIOS DE DADOS LOCAIS
    // =====================================================

    alternarMostrarTodos() {
        this.mostrarTodosLancamentos = !this.mostrarTodosLancamentos;
        this.render();
    }
    alternarMostrarResumo() {
        this.mostrarTodosResumo = !this.mostrarTodosResumo;
        this.render();
    }
    atualizarPerfilMenu() {

        const nomeEl =
            document.querySelector(
                '.menu-profile-name'
            );

        const fotoEl =
            document.querySelector(
                '.menu-profile-photo'
            );
        const avatarDashboard =
            document.getElementById('btnPerfilDashboard');

        const nome =
            this.perfilController
            .obterNome();

        const foto =
            this.perfilController
            .obterFoto();

        if (avatarDashboard) {
            avatarDashboard.textContent =
                nome ? nome.trim().charAt(0).toLocaleUpperCase('pt-BR') : 'J';
            if (foto) {
                avatarDashboard.textContent = '';
                avatarDashboard.style.backgroundImage = `url("${foto}")`;
                avatarDashboard.style.backgroundSize = 'cover';
                avatarDashboard.style.backgroundPosition = '50% 50%';
            }
        }

        if (!nomeEl || !fotoEl) {
            return;
        }

        if (nome) {

            nomeEl.textContent =
                nome;
        }

        if (foto) {

            fotoEl.textContent =
                '';

            fotoEl.style.backgroundImage =
                `url("${foto}")`;

            fotoEl.style.backgroundSize =
                'cover';

            fotoEl.style.backgroundPosition =
                '50% 50%';
        }
    }

    // =====================================================
    // EVENTOS
    // =====================================================

    initEvents() {

        const safeBind =
            (
                id,
                event,
                callback
            ) => {

                const el =
                    document.getElementById(
                        id
                    );

                if (el) {

                    el.addEventListener(
                        event,
                        callback
                    );
                }
            };

        safeBind(
            'btnEditarPerfil',
            'click',
            () => {
                window.location.href =
                    'perfil.html';
            }
        );

        safeBind(
            'btnSalvar',
            'click',
            () =>
            this.salvarLancamento()
        );

        safeBind(
            'btnFecharSemana',
            'click',
            () =>
            this.fecharSemana()
        );

        safeBind(
            'btnSalvarMeta',
            'click',
            () =>
            this.salvarMetaSemanal()
        );

        // =================================================
        // MENU
        // =================================================
safeBind(
            'btnFecharMenu',
            'click',
            () => {
                this.menuController
                    .fecharMenu();
            }
        );

        safeBind(
            'menuOverlay',
            'click',
            () => {
                this.menuController
                    .fecharMenu();
            }
        );

        safeBind(
            'btnAbrirConfiguracao',
            'click',
            () => {
                this.menuController
                    .abrirConfiguracao();
            }
        );

        // =================================================
        // TEMA
        // =================================================
        safeBind('configTema', 'change', () => {
            this.render();
        });

        // =================================================
        // CONFIGURAÇÕES DE PRODUÇÃO
        // =================================================

        safeBind(
            'configSemanaAtual',
            'change',
            () => {

                this.configSemanaPadrao =
                    'atual';

                this.configuracaoService.definir(
                    'semanaPadrao',
                    'atual'
                );

                this.atualizarCampoSemana();

                this.render();
            }
        );

        safeBind(
            'configSemanaEscolhida',
            'change',
            () => {

                this.configSemanaPadrao =
                    'escolhida';

                this.configuracaoService.definir(
                    'semanaPadrao',
                    'escolhida'
                );
                this.atualizarCampoSemana();
                this.render();
            }
        );

        safeBind(
            'configDataSemana',
            'change',
            (event) => {
                this.configDataSemana =
                    event.target.value;

                this.configuracaoService.definir(
                    'dataSemana',
                    this.configDataSemana
                );
                this.render();
            }
        );

        safeBind(
            'configFormatoMilhar',
            'change',
            () => {

                this.configFormatoNumeros =
                    'milhar';

                this.configuracaoService.definir(
                    'formatoNumeros',
                    'milhar'
                );
                this.render();
            }
        );

        safeBind(
            'configFormatoSimples',
            'change',
            () => {

                this.configFormatoNumeros =
                    'simples';

                this.configuracaoService.definir(
                    'formatoNumeros',
                    'simples'
                );
                this.render();
            }
        );

        safeBind(
            'configPerguntarSalvar',
            'change',
            () => {

                this.configConfirmacaoSalvar =
                    'perguntar';

                this.configuracaoService.definir(
                    'confirmacaoSalvar',
                    'perguntar'
                );
            }
        );

        safeBind(
            'configSalvarDireto',
            'change',
            () => {

                this.configConfirmacaoSalvar =
                    'direto';

                this.configuracaoService.definir(
                    'confirmacaoSalvar',
                    'direto'
                );
            }
        );

        safeBind(
            'btnSalvarConfigProducao',
            'click',
            () =>
            this.salvarConfigProducao()
        );

        // =================================================
        // NOTIFICAÇÕES E SONS
        // =================================================

        safeBind(
            'configSomLancamento',
            'change',
            (event) => {
                this.configSomLancamento =
                    event.target.checked;

                this.configuracaoService.definir(
                    'somLancamento',
                    this.configSomLancamento
                );
            }
        );

        safeBind(
            'configSomMeta',
            'change',
            (event) => {
                this.configSomMeta =
                    event.target.checked;

                this.configuracaoService.definir(
                    'somMeta',
                    this.configSomMeta
                );
            }
        );

        safeBind(
            'configConfeteMeta',
            'change',
            (event) => {
                this.configConfeteMeta =
                    event.target.checked;

                this.configuracaoService.definir(
                    'confeteMeta',
                    this.configConfeteMeta
                );
            }
        );

        // =================================================
        // INPUTS
        // =================================================

        const textoInput =
            document.getElementById(
                'textoProducao'
            );

        const valorInput =
            document.getElementById(
                'valorUnitario'
            );

        const inputBusca =
            document.getElementById(
                'inputBusca'
            );

        if (textoInput) {

            textoInput.addEventListener(
                'input',
                () =>
                this.atualizarPreviewTempoReal()
            );
        }

        if (valorInput) {

            valorInput.addEventListener(
                'input',
                () =>
                this.atualizarPreviewTempoReal()
            );
        }

        if (inputBusca) {

            inputBusca.addEventListener(
                'input',
                (e) => {

                    this.termoBusca =
                        e.target.value
                        .toLowerCase()
                        .trim();

                    this.render();
                }
            );
        }

        // =================================================
        // BOTTOM BAR
        // =================================================
        safeBind(
            'btnBottomBusca',
            'click',
            () =>
            this.abrirBuscaRapida()
        );

        safeBind(
            'btnBottomHome',
            'click',
            () => this.menuController.voltarInicio()
        );

        safeBind(
            'btnBottomGestao',
            'click',
            () => {
                window.location.href = './gestao-financeira.html';
            }
        );

        this.carregarConfigProducao();
    }

    // =====================================================
    // SEMANA
    // =====================================================

    atualizarCampoSemana() {

        const campo =
            document.getElementById(
                'configDataSemana'
            );

        if (!campo) {
            return;
        }

        if (
            this.configSemanaPadrao ===
            'escolhida'
        ) {

            campo.style.display =
                'block';

            if (this.configDataSemana) {

                campo.value =
                    this.configDataSemana;
            }

        } else {

            campo.style.display =
                'none';
        }
    }

    salvarConfigProducao() {

        const valorEl =
            document.getElementById(
                'configValorUnitario'
            );

        if (valorEl) {

            const valor =
                parseFloat(
                    valorEl.value
                );

            if (
                isNaN(valor) ||
                valor <= 0
            ) {

                alert(
                    'Digite um valor unitário válido.'
                );

                return;
            }

            this.configValorUnitario =
                valor;

            this.configuracaoService.definir(
                'valorUnitario',
                valor
            );

            const valorPrincipal =
                document.getElementById(
                    'valorUnitario'
                );

            if (valorPrincipal) {

                valorPrincipal.value =
                    valor;
            }
        }
        this.render();
        alert(
            'Configurações de produção salvas com sucesso!'
        );
    }

    formatarNumero(numero) {

        const valor =
            Number(numero) || 0;

        if (
            this.configFormatoNumeros ===
            'simples'
        ) {

            return String(
                Math.round(valor)
            );
        }

        return new Intl.NumberFormat(
            'pt-BR'
        ).format(
            Math.round(valor)
        );
    }

    carregarConfigProducao() {

        const semanaAtual =
            document.getElementById(
                'configSemanaAtual'
            );

        const semanaEscolhida =
            document.getElementById(
                'configSemanaEscolhida'
            );

        const dataSemana =
            document.getElementById(
                'configDataSemana'
            );

        const formatoMilhar =
            document.getElementById(
                'configFormatoMilhar'
            );

        const formatoSimples =
            document.getElementById(
                'configFormatoSimples'
            );

        const perguntarSalvar =
            document.getElementById(
                'configPerguntarSalvar'
            );

        const salvarDireto =
            document.getElementById(
                'configSalvarDireto'
            );

        const somLancamento =
            document.getElementById(
                'configSomLancamento'
            );

        const somMeta =
            document.getElementById(
                'configSomMeta'
            );

        const confeteMeta =
            document.getElementById(
                'configConfeteMeta'
            );

        const valorUnitario =
            document.getElementById(
                'configValorUnitario'
            );

        if (semanaAtual) {

            semanaAtual.checked =
                this.configSemanaPadrao ===
                'atual';
        }

        if (semanaEscolhida) {

            semanaEscolhida.checked =
                this.configSemanaPadrao ===
                'escolhida';
        }

        if (dataSemana) {

            dataSemana.value =
                this.configDataSemana;
        }

        if (formatoMilhar) {

            formatoMilhar.checked =
                this.configFormatoNumeros ===
                'milhar';
        }

        if (formatoSimples) {

            formatoSimples.checked =
                this.configFormatoNumeros ===
                'simples';
        }

        if (perguntarSalvar) {

            perguntarSalvar.checked =
                this.configConfirmacaoSalvar ===
                'perguntar';
        }

        if (salvarDireto) {

            salvarDireto.checked =
                this.configConfirmacaoSalvar ===
                'direto';
        }

        if (somLancamento) {
            somLancamento.checked =
                this.configSomLancamento;
        }

        if (somMeta) {
            somMeta.checked =
                this.configSomMeta;
        }

        if (confeteMeta) {
            confeteMeta.checked =
                this.configConfeteMeta;
        }

        if (valorUnitario) {

            valorUnitario.value =
                this.configValorUnitario;
        }

        const valorUnitarioPrincipal =
            document.getElementById(
                'valorUnitario'
            );

        if (valorUnitarioPrincipal) {

            valorUnitarioPrincipal.value =
                this.configValorUnitario;
        }

    }

    // =====================================================
    // META
    // =====================================================

    salvarMetaSemanal() {

        const inputMeta =
            document.getElementById(
                'inputMetaValor'
            );

        if (!inputMeta) {
            return;
        }

        const novoValor =
            parseFloat(
                inputMeta.value
            );

        if (
            isNaN(novoValor) ||
            novoValor <= 0
        ) {

            alert(
                'Digite um valor válido para a meta.'
            );

            return;
        }

        this.metaSemanal =
            novoValor;

        this.producaoController
            .resetarMetaBatida();

        this.configuracaoService.definir(
            'metaSemanal',
            this.metaSemanal
        );

        inputMeta.value =
            '';

        this.render();
        alert(
            'Meta semanal atualizada com sucesso!'
        );
    }

    // =====================================================
    // PREVIEW
    // =====================================================

    atualizarPreviewTempoReal() {

        const textoEl =
            document.getElementById(
                'textoProducao'
            );

        const valorEl =
            document.getElementById(
                'valorUnitario'
            );

        const previewBox =
            document.getElementById(
                'previewResult'
            );

        if (
            !textoEl ||
            !previewBox
        ) {
            return;
        }

        const texto =
            textoEl.value;

        const valorUnitario =
            parseFloat(
                valorEl ?
                valorEl.value :
                0
            ) || 0;

        if (!texto.trim()) {

            previewBox.style.display =
                'none';

            return;
        }

        const tempLancamento =
            new LancamentoDia(
                texto,
                valorUnitario
            );

        if (tempLancamento.pecas > 0) {

            const pecasEl =
                document.getElementById(
                    'previewPecas'
                );

            const valorTotalEl =
                document.getElementById(
                    'previewValor'
                );

            if (pecasEl) {

                pecasEl.innerText =
                    tempLancamento.pecas;
            }

            if (valorTotalEl) {

                valorTotalEl.innerText =
                    `R$ ${tempLancamento.valorTotal.toFixed(2)}`;
            }

            previewBox.style.display =
                'block';

        } else {

            previewBox.style.display =
                'none';
        }
    }

    // =====================================================
    // SALVAR LANÇAMENTO
    // =====================================================

    async salvarLancamento() {

        const textoEl =
            document.getElementById(
                'textoProducao'
            );

        if (!textoEl) {

            console.error(
                'Campo textoProducao não encontrado.'
            );

            return;
        }

        const texto =
            textoEl.value.trim();

        if (!texto) {

            alert(
                'Digite um lançamento antes de salvar.'
            );

            return;
        }

        const valorUnitario =
            parseFloat(
                document.getElementById(
                    'valorUnitario'
                )?.value
            ) || 0.21;

        const lancamento =
            new LancamentoDia(
                texto,
                valorUnitario
            );

        this.producaoController
            .definirSemanaDoLancamento(
                lancamento,
                this.configSemanaPadrao,
                this.configDataSemana
            );

        this.producaoController
            .definirDataDoLancamento(
                lancamento,
                texto,
                this.configSemanaPadrao,
                this.configDataSemana
            );

        if (
            this.configConfirmacaoSalvar ===
            'perguntar'
        ) {

            const confirmar =
                confirm(
                    `Deseja salvar este lançamento?\n\n` +
                    `Peças: ${lancamento.pecas}\n` +
                    `Valor: R$ ${lancamento.valorTotal.toFixed(2)}`
                );

            if (!confirmar) {
                return;
            }
        }

        this.lancamentosAtuais.push(
            lancamento
        );

        this.storage.salvarLancamentosTemporarios(
            this.lancamentosAtuais
        );

        if (this.configSomLancamento) {
            tocarSomLancamento();
        }

        textoEl.value =
            '';

        const previewBox =
            document.getElementById(
                'previewResult'
            );

        if (previewBox) {

            previewBox.style.display =
                'none';
        }
        this.render();
    }

    // =====================================================
    // REMOVER LANÇAMENTO
    // =====================================================

    async removerLancamento(index) {

        if (
            !confirm(
                'Deseja realmente excluir este lançamento?'
            )
        ) {
            return;
        }

        if (
            index < 0 ||
            index >= this.lancamentosAtuais.length
        ) {
            return;
        }

        this.lancamentosAtuais.splice(
            index,
            1
        );

        this.storage.salvarLancamentosTemporarios(
            this.lancamentosAtuais
        );
        this.render();
    }

    // =====================================================
    // EDITAR LANÇAMENTO
    // =====================================================

    editarLancamento(index) {

        const reg =
            this.lancamentosAtuais[
                index
            ];

        if (!reg) {
            return;
        }

        const textoEl =
            document.getElementById(
                'textoProducao'
            );

        const valorEl =
            document.getElementById(
                'valorUnitario'
            );

        if (textoEl) {

            textoEl.value =
                reg.textoBruto ||
                reg.textoOriginal ||
                '';
        }

        if (
            valorEl &&
            reg.valorUnitario
        ) {

            valorEl.value =
                reg.valorUnitario;
        }

        this.lancamentosAtuais.splice(
            index,
            1
        );

        this.storage.salvarLancamentosTemporarios(
            this.lancamentosAtuais
        );
        this.render();
        if (textoEl) {
            textoEl.focus();
        }
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // =====================================================
    // FECHAR SEMANA
    // =====================================================

    async fecharSemana() {

        const lancamentosDaSemana =
            this.producaoController
            .obterLancamentosDaSemana(
                this.lancamentosAtuais,
                this.configSemanaPadrao,
                this.configDataSemana
            );

        if (
            lancamentosDaSemana.length ===
            0
        ) {

            alert(
                'Não há lançamentos nesta semana.'
            );

            return;
        }

        if (
            !confirm(
                'Deseja fechar esta semana e salvá-la no histórico?'
            )
        ) {
            return;
        }

        const semana =
            new SemanaProducao(
                lancamentosDaSemana
            );

        try {

            await this.storage
                .salvarSemana(
                    semana
                );

        } catch (erro) {

            console.error(
                'Não foi possível fechar a semana:',
                erro
            );

            alert(
                'Não foi possível salvar a semana no histórico. ' +
                'Os lançamentos foram mantidos.'
            );

            return;
        }

        this.lancamentosAtuais =
            this.lancamentosAtuais.filter(
                reg =>
                !lancamentosDaSemana.includes(
                    reg
                )
            );

        this.storage.salvarLancamentosTemporarios(
            this.lancamentosAtuais
        );

        if (
            this.configSemanaPadrao ===
            'atual'
        ) {

            this.producaoController
                .fecharSemana();
        }
        this.render();
        alert(
            'Semana fechada com sucesso!'
        );
    }

    // =====================================================
    // BOTTOM BAR
    // =====================================================

    abrirBuscaRapida() {

        const inputBusca =
            document.getElementById(
                'inputBusca'
            );

        const cardSemana =
            document.getElementById(
                'cardSemanaAtual'
            );

        if (cardSemana) {

            cardSemana.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        if (inputBusca) {

            setTimeout(
                () => {

                    inputBusca.focus();
                    inputBusca.select();

                },
                350
            );
        }
    }

    // =====================================================
    // RENDER
    // =====================================================

    async render() {
        // 1. Processa dados e lógica através do Serviço
        const dadosProcessados = ProducaoService.processarDadosSemana(
            this.lancamentosAtuais,
            this.producaoController,
            this.configSemanaPadrao,
            this.configDataSemana,
            this.termoBusca,
            this.mostrarTodosLancamentos,
            this.mostrarTodosResumo
        );

        const {
            lancamentosDaSemana,
            lancamentosFiltrados,
            totais,
            gruposPorPreco,
            chavesPreco,
            totalLancamentosGeral
        } = dadosProcessados;

        const referenciaFinanceira =
            this.configSemanaPadrao === 'escolhida' && this.configDataSemana
                ? this.configDataSemana
                : this.producaoController.obterSemanaReferencia();

        const todasDespesas =
            this.despesasPessoaisService.obterTodas();

        const hojeFinanceiro =
            new Date().toISOString().slice(0, 10);

        const dataLimiteFinanceira =
            this.configSemanaPadrao === 'escolhida' && this.configDataSemana
                ? (() => {
                    const fim = new Date(`${referenciaFinanceira}T00:00:00`);
                    fim.setDate(fim.getDate() + 6);
                    return fim.toISOString().slice(0, 10);
                })()
                : hojeFinanceiro;

        // A pessoa registra cada despesa uma única vez, sem precisar separar os gastos em grupos.
        // A referência é interna para associar os gastos à produção em andamento.
        // Registros antigos sem referência são associados pelo período da despesa.
        const despesasDaProducao =
            todasDespesas.filter(despesa => {
                if (despesa.semanaReferencia) {
                    return despesa.semanaReferencia === referenciaFinanceira;
                }

                const dataDespesa = String(despesa.data || '');
                return Boolean(
                    dataDespesa &&
                    dataDespesa >= referenciaFinanceira &&
                    dataDespesa <= dataLimiteFinanceira
                );
            });

        const despesasDoMesFinanceiro =
            todasDespesas.filter(despesa =>
                String(despesa.data || '').startsWith(
                    new Date().toISOString().slice(0, 7)
                )
            );

        // Quando despesas antigas não têm uma referência compatível com a
        // produção atual, usa a média semanal do total mensal para que o
        // ponto de equilíbrio não seja zerado apesar de existirem despesas.
        const usarMediaMensalDespesas =
            despesasDaProducao.length === 0 &&
            despesasDoMesFinanceiro.length > 0;

        const despesasFixasDaProducao = usarMediaMensalDespesas
            ? despesasDoMesFinanceiro.reduce(
                (soma, despesa) => soma + (Number(despesa.valor) || 0),
                0
            ) / 4
            : despesasDaProducao
                .filter(despesa => despesa.tipo === 'fixa')
                .reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);

        const despesasVariaveisDaProducao = usarMediaMensalDespesas
            ? 0
            : despesasDaProducao
                .filter(despesa => despesa.tipo !== 'fixa')
                .reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);

        const dadosBaseFinanceiros =
            this.gestaoFinanceiraService.calcular({
                custoFixoMensal: this.custoFixoMensal,

                retiradaSemanalDesejada: this.retiradaSemanalDesejada,

                valorUnitario: this.configValorUnitario,

                metaSemanal: this.metaSemanal,

                pecasProduzidas: totais.totalPecas
            });

        const planejamentoFinanceiro =
            this.planejamentoFinanceiroService.calcular({
                modo: this.modoPlanejamentoFinanceiro,
                valorProduzido: totais.totalValor,
                valorUnitario: this.configValorUnitario,
                custoFixoSemanal:
                    dadosBaseFinanceiros.custoFixoSemanal +
                    despesasFixasDaProducao,
                custoVariavelSemanal: despesasVariaveisDaProducao,
                retiradaSemanalDesejada: this.retiradaSemanalDesejada
            });

        const retiradaCalculada =
            planejamentoFinanceiro.valorRetiradaPlanejada;

        const dadosFinanceiros = {
            ...dadosBaseFinanceiros,
            valorProduzido: totais.totalValor,
            custoFixoSemanal: planejamentoFinanceiro.custosDespesas,
            pecasPontoEquilibrio: planejamentoFinanceiro.pecasPontoEquilibrio,
            retiradaSemanalDesejada: retiradaCalculada,
            pecasRetirada: this.configValorUnitario > 0
                ? retiradaCalculada / this.configValorUnitario
                : 0,
            valorAposEquilibrio: planejamentoFinanceiro.saldoAposCustos,
            excedente: this.modoPlanejamentoFinanceiro === 'valor_restante'
                ? planejamentoFinanceiro.saldoAposCustos
                : Math.max(
                    planejamentoFinanceiro.saldoAposCustos -
                        planejamentoFinanceiro.retiradaSemanalDesejada,
                    0
                ),
            custosDespesas: planejamentoFinanceiro.custosDespesas,
            despesasFixasRegistradas: despesasFixasDaProducao,
            despesasVariaveisRegistradas: despesasVariaveisDaProducao,
            planejamentoFinanceiro
        };

        this.dadosFinanceiros =
            dadosFinanceiros;

        // Atualiza os cards da Gestão Financeira quando a produção muda.
        window.atualizarDashboardGestaoFinanceira?.();

        // Atualiza o resumo da nova tela inicial usando os registros reais.
        UIRenderer.renderizarResumoPainel(this, lancamentosDaSemana);

        // 2. Renderiza a Meta e Totais
        this.renderizarMeta(totais.totalValor);

        // 3. Renderiza os Totais (em cima do botão fechar semana)
        const totalGeralValorEl =
            document.getElementById('totalGeralValor');

        const totalGeralPecasEl =
            document.getElementById('totalGeralPecas');

        if (totalGeralValorEl) {
            totalGeralValorEl.textContent =
                `R$ ${totais.totalValor.toFixed(2)}`;
        }

        if (totalGeralPecasEl) {
            totalGeralPecasEl.textContent =
                this.formatarNumero(totais.totalPecas);
        }

        // 4. Delega a renderização da Lista e Resumo para o UIRenderer
        const listaAtualEl = document.getElementById('listaHistorico');
        UIRenderer.renderizarListaAtual(listaAtualEl, lancamentosFiltrados, this);

        const resumoSemanalPrecoEl = document.getElementById('resumoSemanalPreco');
        UIRenderer.renderizarResumoPreco(resumoSemanalPrecoEl, gruposPorPreco, chavesPreco, totalLancamentosGeral, this);

        // 5. Renderiza o Histórico de Semanas (logo abaixo da semana atual)
        const historicoEl = document.getElementById('listaArquivo');
        UIRenderer.renderizarHistoricoSemanas(historicoEl, this);
    }

    // Auxiliar extraído do render antigo apenas para manter a lógica da barra de meta limpa
    renderizarMeta(totalValor) {
        const textoMetaEl = document.getElementById('textoMetaProgresso');
        const porcentagemEl = document.getElementById('porcentagemMeta');
        const barraEl = document.getElementById('barraProgressoMeta');

        if (textoMetaEl && porcentagemEl && barraEl) {
            const progressoPorcentagem = this.metaSemanal > 0 ? (totalValor / this.metaSemanal) * 100 : 0;
            const porcentagemLimitada = Math.min(progressoPorcentagem, 100);

            textoMetaEl.innerText = `R$ ${totalValor.toFixed(2)} / R$ ${this.metaSemanal.toFixed(2)}`;
            porcentagemEl.innerText = `${progressoPorcentagem.toFixed(0)}%`;
            barraEl.style.width = `${porcentagemLimitada}%`;

            if (progressoPorcentagem >= 100) {
                barraEl.style.backgroundColor = 'var(--accent-color)';
                if (
                    !this.producaoController
                    .metaJaFoiBatida()
                ) {
                    this.producaoController
                        .marcarMetaBatida();

                    setTimeout(() => {
                        if (this.configSomMeta) {
                            tocarSomMetaBatida();
                        }

                        if (this.configConfeteMeta) {
                            dispararAnimacaoMetaBatida();
                        }
                    }, 100);
                }
            } else {
                barraEl.style.backgroundColor = 'var(--accent-color)';
                this.producaoController
                    .resetarMetaBatida();
            }
        }
    }
} // <--- FECHAMENTO DA CLASSE APPCONTROLLER ADICIONADO AQUI


// =========================================================
// INICIALIZAÇÃO (Agora fora da classe corretamente)
// =========================================================

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        () =>
        new AppController()
    );

} else {

    new AppController();
}