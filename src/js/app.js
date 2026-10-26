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
import {
    supabaseRelacionalService
} from './SupabaseRelacionalService.js';
import {
    sincronizacaoRelacionalController
} from './SincronizacaoRelacionalController.js';
import { supabaseConfigurado } from './SupabaseService.js';
import { iniciarGoogleSyncAutomatica } from './GoogleAutoSync.js';


// Sincroniza preferências alteradas automaticamente, sem bloquear a gravação local.
// Várias alterações rápidas são agrupadas em uma única gravação remota.
let timerSincronizacaoConfiguracoes = null;
let sincronizacaoConfiguracoesEmCurso = false;
let sincronizacaoConfiguracoesPendente = false;
window.addEventListener('anotei:configuracao-alterada', () => {
    if (!supabaseConfigurado) return;
    sincronizacaoConfiguracoesPendente = true;
    if (timerSincronizacaoConfiguracoes) clearTimeout(timerSincronizacaoConfiguracoes);
    timerSincronizacaoConfiguracoes = setTimeout(async () => {
        if (sincronizacaoConfiguracoesEmCurso) return;
        sincronizacaoConfiguracoesEmCurso = true;
        try {
            do {
                sincronizacaoConfiguracoesPendente = false;
                const configuracaoService = new ConfiguracaoService();
                const locais = configuracaoService.obterTodas();
                const remotoAtual = await supabaseRelacionalService.obterConfiguracoes();
                await supabaseRelacionalService.salvarConfiguracoes(locais, remotoAtual?.versao ?? null);
                console.info('[Anotei Sync] Configurações sincronizadas com sucesso.');
            } while (sincronizacaoConfiguracoesPendente);
        } catch (erro) {
            // A cópia local é mantida; a página de migração permite reenviar manualmente.
            console.error('[Anotei Sync] Não foi possível sincronizar configurações:', erro?.message || erro);
        } finally {
            sincronizacaoConfiguracoesEmCurso = false;
        }
    }, 500);
});

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
        this.supabaseRelacionalService = supabaseRelacionalService;

        window.app =
            this;

        // =====================================================
        // INICIALIZAÇÃO
        // =====================================================

        this.initEvents();
        this.atualizarPerfilMenu();
        this.render();

        // Busca os lançamentos remotos sem bloquear a abertura do app.
        this.carregarLancamentosRemotos();
        this.iniciarSincronizacaoCompartilhada();
    }

    async carregarLancamentosRemotos() {
        if (!supabaseConfigurado) return;

        try {
            const remotos =
                await this.supabaseRelacionalService.listarLancamentos();

            const locais =
                this.storage.obterLancamentosTemporarios();

            // Mantém localmente apenas os itens que ainda estão na fila
            // de sincronização. O restante é reconciliado com o servidor,
            // evitando que exclusões remotas reapareçam após recarregar.
            let fila = [];
            try {
                const valor = JSON.parse(
                    localStorage.getItem('anotei_fila_sincronizacao_v1') || '[]'
                );
                if (Array.isArray(valor)) fila = valor;
            } catch (erro) {
                console.warn('[Anotei Sync] Fila local inválida:', erro);
            }

            const idsPendentes = new Set(
                fila
                    .filter(item => item?.tipo === 'lancamento' && item.payload)
                    .map(item => String(item.payload.id ?? item.payload.id_origem ?? ''))
                    .filter(Boolean)
            );

            const porOrigem = new Map();

            for (const remoto of remotos) {
                const payload =
                    remoto.source_payload &&
                    typeof remoto.source_payload === 'object'
                        ? remoto.source_payload
                        : {};

                const lancamento = {
                    ...payload,
                    id: remoto.id_origem ?? payload.id,
                    id_origem: remoto.id_origem ?? payload.id_origem ?? payload.id,
                    pecas: Number(remoto.pecas ?? payload.pecas ?? 0),
                    valorUnitario: Number(
                        remoto.valor_unitario ?? payload.valorUnitario ?? 0.21
                    ),
                    valorTotal: Number(
                        remoto.valor_total ?? payload.valorTotal ?? 0
                    ),
                    data: remoto.data_texto ?? payload.data ?? '',
                    dataISO: remoto.data_producao ?? payload.dataISO ?? '',
                    dataCompleta:
                        remoto.data_completa_texto ?? payload.dataCompleta ?? '',
                    semanaReferencia:
                        remoto.semana_referencia ?? payload.semanaReferencia ?? null,
                    textoOriginal:
                        remoto.texto_original ?? payload.textoOriginal ?? '',
                    textoBruto:
                        remoto.texto_bruto ??
                        payload.textoBruto ??
                        remoto.texto_original ??
                        '',
                    detalhes: Array.isArray(remoto.detalhes)
                        ? remoto.detalhes
                        : Array.isArray(payload.detalhes)
                            ? payload.detalhes
                            : []
                };

                porOrigem.set(String(remoto.id_origem ?? remoto.id), lancamento);
            }

            // Preserva somente registros locais comprovadamente pendentes.
            for (const local of locais) {
                if (!local || typeof local !== 'object') continue;
                const id = local.id_origem ?? local.id;
                if (id != null && idsPendentes.has(String(id)) &&
                    !porOrigem.has(String(id))) {
                    porOrigem.set(String(id), local);
                }
            }

            this.lancamentosAtuais = [...porOrigem.values()];
            this.storage.salvarLancamentosTemporarios(this.lancamentosAtuais);

            console.info('[Anotei Sync] Reconciliação concluída:', {
                remotos: remotos.length,
                pendentesLocais: this.lancamentosAtuais.length - remotos.length,
                totalNaTela: this.lancamentosAtuais.length
            });

            await this.render();
        } catch (erro) {
            console.error(
                '[Anotei Sync] Não foi possível carregar lançamentos remotos:',
                erro?.message || erro
            );
        }
    }

    iniciarSincronizacaoCompartilhada() {
        if (this._anoteiSyncTimer) return;

        const atualizar = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                this.carregarLancamentosRemotos();
                sincronizacaoRelacionalController.executarPendencias();
            }
        };

        // Supabase Realtime propaga mudanças entre sessões autenticadas.
        this.supabaseRelacionalService
            .assinarAlteracoesLancamentos(atualizar)
            .then(cancelar => {
                this._anoteiRealtimeCancelar = cancelar;
            })
            .catch(erro => {
                console.warn(
                    '[Anotei Sync] Realtime indisponível; usando atualização periódica:',
                    erro?.message || erro
                );
            });

        // Fallback caso Realtime não esteja habilitado na publicação Supabase.
        this._anoteiSyncTimer = window.setInterval(atualizar, 5000);
        window.addEventListener('online', atualizar);
        document.addEventListener('visibilitychange', atualizar);
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

        // Preserva o ID ao editar para atualizar o mesmo registro remoto.
        lancamento.id = this._idLancamentoEmEdicao ||
            globalThis.crypto?.randomUUID?.() ||
            `lancamento-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this._idLancamentoEmEdicao = null;

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

        // A gravação local é preservada mesmo se a sincronização falhar.
        if (supabaseConfigurado) {
            try {
                sincronizacaoRelacionalController.enfileirar(
                    'lancamento',
                    lancamento
                );

                const resultado =
                    await sincronizacaoRelacionalController.executarPendencias();

                console.info(
                    '[Anotei Sync] Resultado da sincronização:',
                    resultado
                );
            } catch (erro) {
                console.error(
                    '[Anotei Sync] Lançamento mantido localmente; sincronização pendente:',
                    erro?.message || erro
                );
            }
        }

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
            index < 0 ||
            index >= this.lancamentosAtuais.length
        ) {
            return;
        }

        const lancamento = this.lancamentosAtuais[index];
        if (!lancamento) return;

        if (!confirm('Deseja realmente excluir este lançamento?')) {
            return;
        }

        const origem = lancamento.id_origem ?? lancamento.id;
        if (origem === undefined || origem === null ||
            String(origem).trim() === '') {
            alert(
                'Não foi possível identificar este lançamento. ' +
                'Nenhum dado foi removido.'
            );
            return;
        }

        try {
            if (supabaseConfigurado) {
                await this.supabaseRelacionalService
                    .excluirLancamentoPorOrigem(origem);
            }

            this.lancamentosAtuais.splice(index, 1);
            this.storage.salvarLancamentosTemporarios(
                this.lancamentosAtuais
            );

            await this.render();
        } catch (erro) {
            console.error(
                '[Anotei Sync] Falha ao excluir lançamento:',
                erro
            );
            alert(
                'A exclusão no servidor falhou. ' +
                'O lançamento foi mantido na tela. ' +
                'Confira a conexão e as permissões do Supabase.'
            );
        }
    }

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

        this._idLancamentoEmEdicao = reg.id_origem ?? reg.id;

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
// Sincronização Google em segundo plano: não bloqueia a inicialização do Anotei.
queueMicrotask(() => iniciarGoogleSyncAutomatica());
