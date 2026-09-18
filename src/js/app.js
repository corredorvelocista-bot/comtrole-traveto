import { StorageService } from './StorageService.js';
import { LancamentoDia, SemanaProducao } from './Producao.js';

class AppController {
    constructor() {
        this.metaBatidaDisparada =
            JSON.parse(
                localStorage.getItem('meta_batida_disparada')
            ) || false;

        this.storage =
            new StorageService();

        this.lancamentosAtuais =
            JSON.parse(
                localStorage.getItem('temp_lancamentos')
            ) || [];

        this.termoBusca = '';

        this.sincronizadoComNuvem =
            JSON.parse(
                localStorage.getItem('sincronizado_nuvem')
            ) ?? true;

        const ambienteLocal =
            window.location.hostname === 'localhost';

        this.spreadsheetStorageKey =
            ambienteLocal
                ? 'google_spreadsheet_id_dev'
                : 'google_spreadsheet_id';

        this.nomePlanilhaGoogle =
            ambienteLocal
                ? 'Controle de Travete - TESTE DEV'
                : 'Controle de Travete - Meus Dados';

        this.spreadsheetIdSalvo =
            localStorage.getItem(
                this.spreadsheetStorageKey
            ) || null;

        this.metaSemanal =
            parseFloat(
                localStorage.getItem(
                    'meta_semanal_valor'
                )
            ) || 500.00;

        // =====================================================
        // CONFIGURAÇÕES DE PRODUÇÃO
        // =====================================================

        this.configSemanaPadrao =
            localStorage.getItem(
                'config_semana_padrao'
            ) || 'atual';

        this.configDataSemana =
            localStorage.getItem(
                'config_data_semana'
            ) || '';

        this.configFormatoNumeros =
            localStorage.getItem(
                'config_formato_numeros'
            ) || 'milhar';

        this.configConfirmacaoSalvar =
            localStorage.getItem(
                'config_confirmacao_salvar'
            ) || 'perguntar';

        this.configValorUnitario =
            parseFloat(
                localStorage.getItem(
                    'config_valor_unitario'
                )
            ) || 0.21;

        // =====================================================
        // CONFIGURAÇÃO GOOGLE AUTH
        // =====================================================

        this.CLIENT_ID =
            ambienteLocal
                ? '751192071126-02fgofvlqbofcks42kb93jd8te7ktq24.apps.googleusercontent.com'
                : '751192071126-02l99756dcqr65orhm2iqs5hajnjr54i.apps.googleusercontent.com';

        this.SCOPES =
            'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

        this.tokenClient = null;

        this.accessToken =
            localStorage.getItem(
                'google_access_token'
            ) || null;

        // =====================================================
        // TEMA
        // =====================================================

        this.tema =
            localStorage.getItem(
                'tema_aparencia'
            ) || 'escuro';

        this.aplicarTema();

        window.app = this;

        this.initGoogleAuth();
        this.initEvents();
        this.render();
    }

    // =====================================================
    // TEMA
    // =====================================================

    aplicarTema() {
        const tema = this.tema;

        if (tema === 'claro') {
            document.documentElement.setAttribute(
                'data-theme',
                'claro'
            );

            return;
        }

        if (tema === 'automatico') {
            const sistemaEscuro =
                window.matchMedia(
                    '(prefers-color-scheme: dark)'
                ).matches;

            if (sistemaEscuro) {
                document.documentElement.removeAttribute(
                    'data-theme'
                );
            } else {
                document.documentElement.setAttribute(
                    'data-theme',
                    'claro'
                );
            }

            return;
        }

        document.documentElement.removeAttribute(
            'data-theme'
        );
    }

    // =====================================================
    // SOM DO LANÇAMENTO
    // =====================================================

    tocarSomLancamento() {
        try {
            const audioCtx =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

            const now =
                audioCtx.currentTime;

            const tocarNota =
                (
                    frequencia,
                    inicio,
                    duracao
                ) => {
                    const osc =
                        audioCtx.createOscillator();

                    const gain =
                        audioCtx.createGain();

                    osc.type =
                        'sine';

                    osc.frequency.setValueAtTime(
                        frequencia,
                        inicio
                    );

                    gain.gain.setValueAtTime(
                        0.05,
                        inicio
                    );

                    gain.gain.exponentialRampToValueAtTime(
                        0.0001,
                        inicio + duracao
                    );

                    osc.connect(gain);
                    gain.connect(
                        audioCtx.destination
                    );

                    osc.start(inicio);

                    osc.stop(
                        inicio + duracao
                    );
                };

            tocarNota(
                523.25,
                now,
                0.15
            );

            tocarNota(
                659.25,
                now + 0.04,
                0.2
            );

        } catch (e) {
            // Ignora se o navegador bloquear autoplay
        }
    }

    // =====================================================
    // SOM DA META
    // =====================================================

    tocarSomMetaBatida() {
        try {
            const audioCtx =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

            const now =
                audioCtx.currentTime;

            const tocarNota =
                (
                    frequencia,
                    inicio,
                    duracao
                ) => {
                    const osc =
                        audioCtx.createOscillator();

                    const gain =
                        audioCtx.createGain();

                    osc.type =
                        'triangle';

                    osc.frequency.setValueAtTime(
                        frequencia,
                        inicio
                    );

                    gain.gain.setValueAtTime(
                        0.08,
                        inicio
                    );

                    gain.gain.exponentialRampToValueAtTime(
                        0.0001,
                        inicio + duracao
                    );

                    osc.connect(gain);
                    gain.connect(
                        audioCtx.destination
                    );

                    osc.start(inicio);

                    osc.stop(
                        inicio + duracao
                    );
                };

            tocarNota(
                523.25,
                now,
                0.15
            );

            tocarNota(
                659.25,
                now + 0.12,
                0.15
            );

            tocarNota(
                783.99,
                now + 0.24,
                0.15
            );

            tocarNota(
                1046.50,
                now + 0.36,
                0.4
            );

        } catch (e) {
            // Ignora se bloqueado pelo navegador
        }
    }

    // =====================================================
    // ANIMAÇÃO DA META
    // =====================================================

    dispararAnimacaoMetaBatida() {
        this.tocarSomMetaBatida();

        const quantidade = 30;

        const cores = [
            '#4caf50',
            '#ff9800',
            '#2196f3',
            '#e91e63',
            '#ffeb3b'
        ];

        for (
            let i = 0;
            i < quantidade;
            i++
        ) {
            const confete =
                document.createElement(
                    'div'
                );

            confete.style.position =
                'fixed';

            confete.style.width =
                `${Math.random() * 8 + 6}px`;

            confete.style.height =
                `${Math.random() * 8 + 6}px`;

            confete.style.backgroundColor =
                cores[
                    Math.floor(
                        Math.random() *
                        cores.length
                    )
                ];

            confete.style.top =
                '-10px';

            confete.style.left =
                `${Math.random() * window.innerWidth}px`;

            confete.style.opacity =
                '1';

            confete.style.borderRadius =
                '50%';

            confete.style.zIndex =
                '9999';

            confete.style.pointerEvents =
                'none';

            const anim =
                confete.animate(
                    [
                        {
                            transform:
                                'translate3d(0, 0, 0) rotate(0deg)',
                            opacity: 1
                        },
                        {
                            transform:
                                `translate3d(${(Math.random() - 0.5) * 200}px, ${window.innerHeight + 50}px, 0) rotate(${Math.random() * 720}deg)`,
                            opacity: 0
                        }
                    ],
                    {
                        duration:
                            Math.random() *
                            1000 +
                            1500,

                        easing:
                            'cubic-bezier(0.25, 1, 0.5, 1)'
                    }
                );

            document.body.appendChild(
                confete
            );

            anim.onfinish =
                () =>
                    confete.remove();
        }
    }

    // =====================================================
    // GOOGLE AUTH
    // =====================================================

    initGoogleAuth() {
        if (
            typeof google === 'undefined' ||
            !google.accounts ||
            !google.accounts.oauth2
        ) {
            console.warn(
                'Google Identity Services ainda não carregou. Tentando novamente...'
            );

            setTimeout(
                () =>
                    this.initGoogleAuth(),
                500
            );

            return;
        }

        this.tokenClient =
            google.accounts.oauth2.initTokenClient({
                client_id:
                    this.CLIENT_ID,

                scope:
                    this.SCOPES,

                callback:
                    (response) => {
                        if (
                            response.error
                        ) {
                            console.error(
                                response
                            );

                            alert(
                                'Erro na autenticação com o Google.'
                            );

                            return;
                        }

                        this.accessToken =
                            response.access_token;

                        localStorage.setItem(
                            'google_access_token',
                            this.accessToken
                        );

                        this.atualizarInterfaceLogin(
                            true
                        );

                        this.render();

                        alert(
                            'Conta Google conectada com sucesso!'
                        );
                    }
            });

        if (this.accessToken) {
            this.atualizarInterfaceLogin(
                true
            );
        } else {
            this.atualizarInterfaceLogin(
                false
            );
        }
    }

    atualizarInterfaceLogin(logado) {
        const statusEl =
            document.getElementById(
                'statusLogin'
            );

        const btnLogin =
            document.getElementById(
                'btnLoginGoogle'
            );

        const btnLogout =
            document.getElementById(
                'btnLogoutGoogle'
            );

        if (
            statusEl &&
            btnLogin &&
            btnLogout
        ) {
            if (logado) {
                statusEl.innerText =
                    'Status: Conectado ao Google Drive ✅';

                statusEl.style.color =
                    'var(--accent-color)';

                btnLogin.style.display =
                    'none';

                btnLogout.style.display =
                    'inline-block';

            } else {
                statusEl.innerText =
                    'Status: Desconectado';

                statusEl.style.color =
                    'var(--muted-color)';

                btnLogin.style.display =
                    'inline-flex';

                btnLogout.style.display =
                    'none';
            }
        }
    }

    fazerLoginGoogle() {
        if (!this.tokenClient) {
            alert(
                'A biblioteca do Google ainda está carregando ou falhou. Verifique sua conexão.'
            );

            return;
        }

        this.tokenClient.requestAccessToken({
            prompt: 'consent'
        });
    }

    fazerLogoutGoogle() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(
                this.accessToken,
                () => {
                    this.accessToken =
                        null;

                    localStorage.removeItem(
                        'google_access_token'
                    );

                    localStorage.removeItem(
                        this.spreadsheetStorageKey
                    );

                    this.spreadsheetIdSalvo =
                        null;

                    this.atualizarInterfaceLogin(
                        false
                    );

                    this.render();

                    alert(
                        'Você desconectou sua conta do Google.'
                    );
                }
            );
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

        // Google
        safeBind(
            'btnLoginGoogle',
            'click',
            () =>
                this.fazerLoginGoogle()
        );

        safeBind(
            'btnLogoutGoogle',
            'click',
            () =>
                this.fazerLogoutGoogle()
        );

        safeBind(
            'btnEnviarNuvem',
            'click',
            () =>
                this.enviarParaGoogleSheetsAutomatico()
        );

        safeBind(
            'btnAbrirPlanilhaDrive',
            'click',
            () =>
                this.abrirPlanilhaNoNavegador()
        );

        // =================================================
        // MENU
        // =================================================

        const menuLateral =
            document.getElementById(
                'menuLateral'
            );

        const menuOverlay =
            document.getElementById(
                'menuOverlay'
            );

        safeBind(
            'btnMenuHamburger',
            'click',
            () => {
                if (menuLateral) {
                    menuLateral.classList.add(
                        'ativo'
                    );
                }

                if (menuOverlay) {
                    menuOverlay.classList.add(
                        'ativo'
                    );
                }
            }
        );

        const fecharMenuFunc =
            () => {
                if (menuLateral) {
                    menuLateral.classList.remove(
                        'ativo'
                    );
                }

                if (menuOverlay) {
                    menuOverlay.classList.remove(
                        'ativo'
                    );
                }
            };

        safeBind(
            'btnFecharMenu',
            'click',
            fecharMenuFunc
        );

        safeBind(
            'menuOverlay',
            'click',
            fecharMenuFunc
        );

        safeBind(
            'btnAbrirConfiguracao',
            'click',
            () => {
                const painelConfiguracao =
                    document.getElementById(
                        'painelConfiguracao'
                    );

                if (painelConfiguracao) {
                    painelConfiguracao.classList.toggle(
                        'ativo'
                    );
                }
            }
        );

        // =================================================
        // TEMA
        // =================================================

        safeBind(
            'configTema',
            'change',
            (event) => {
                this.tema =
                    event.target.value;

                localStorage.setItem(
                    'tema_aparencia',
                    this.tema
                );

                this.aplicarTema();

                this.render();
            }
        );

        // =================================================
        // CONFIGURAÇÕES DE PRODUÇÃO
        // =================================================

        safeBind(
            'configSemanaAtual',
            'change',
            () => {
                this.configSemanaPadrao =
                    'atual';

                localStorage.setItem(
                    'config_semana_padrao',
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

                localStorage.setItem(
                    'config_semana_padrao',
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

                localStorage.setItem(
                    'config_data_semana',
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

                localStorage.setItem(
                    'config_formato_numeros',
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

                localStorage.setItem(
                    'config_formato_numeros',
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

                localStorage.setItem(
                    'config_confirmacao_salvar',
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

                localStorage.setItem(
                    'config_confirmacao_salvar',
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
            'btnBottomSync',
            'click',
            () =>
                this.acaoBottomSync()
        );

        safeBind(
            'btnBottomBusca',
            'click',
            () =>
                this.abrirBuscaRapida()
        );

        safeBind(
            'btnBottomMenu',
            'click',
            () =>
                this.abrirMenuBottom()
        );

        this.carregarConfigProducao();
    }

    // =====================================================
    // SEMANA DE PRODUÇÃO
    // =====================================================

    obterSemanaReferencia() {
        if (
            this.configSemanaPadrao ===
            'atual'
        ) {
            const agora =
                new Date();

            return agora
                .toISOString()
                .slice(0, 10);
        }

        if (
            this.configSemanaPadrao ===
            'escolhida' &&
            this.configDataSemana
        ) {
            return this.configDataSemana;
        }

        const agora =
            new Date();

        return agora
            .toISOString()
            .slice(0, 10);
    }

    obterLancamentosDaSemana() {
        const referencia =
            this.obterSemanaReferencia();

        return this.lancamentosAtuais.filter(
            reg => {
                if (
                    !reg.semanaReferencia
                ) {
                    return (
                        this.configSemanaPadrao ===
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

    atualizarCampoSemana() {
        const campo =
            document.getElementById(
                'configDataSemana'
            );

        if (!campo) return;

        if (
            this.configSemanaPadrao ===
            'escolhida'
        ) {
            campo.style.display =
                'block';

            if (
                this.configDataSemana
            ) {
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

            localStorage.setItem(
                'config_valor_unitario',
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

        alert(
            'Configurações de produção salvas com sucesso!'
        );

        this.atualizarCampoSemana();
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

        if (valorUnitario) {
            valorUnitario.value =
                this.configValorUnitario;
        }

        this.atualizarCampoSemana();
    }

    // =====================================================
    // META SEMANAL
    // =====================================================

    salvarMetaSemanal() {
        const inputMeta =
            document.getElementById(
                'inputMetaValor'
            );

        if (!inputMeta) return;

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

        this.metaBatidaDisparada =
            false;

        localStorage.setItem(
            'meta_batida_disparada',
            'false'
        );

        localStorage.setItem(
            'meta_semanal_valor',
            this.metaSemanal
        );

        inputMeta.value = '';

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
                valorEl
                    ? valorEl.value
                    : 0
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

        if (
            tempLancamento.pecas > 0
        ) {
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

    salvarLancamento() {
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

        lancamento.sincronizado =
            false;

        lancamento.semanaReferencia =
            this.obterSemanaReferencia();

        // =================================================
        // CORREÇÃO DA DATA DA SEMANA ESCOLHIDA
        // =================================================

        if (
            !texto.match(/\d{2}\/\d{2}/) &&
            this.configSemanaPadrao ===
            'escolhida' &&
            this.configDataSemana
        ) {
            const dataEscolhida =
                new Date(
                    this.configDataSemana +
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
        }

        // =================================================
        // CONFIRMAÇÃO
        // =================================================

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

        // =================================================
        // SALVAR
        // =================================================

        this.lancamentosAtuais.push(
            lancamento
        );

        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(
                this.lancamentosAtuais
            )
        );

        this.tocarSomLancamento();

        this.sincronizadoComNuvem =
            false;

        localStorage.setItem(
            'sincronizado_nuvem',
            'false'
        );

        textoEl.value = '';

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

    removerLancamento(index) {
        if (
            confirm(
                'Deseja realmente excluir este lançamento?'
            )
        ) {
            this.lancamentosAtuais.splice(
                index,
                1
            );

            localStorage.setItem(
                'temp_lancamentos',
                JSON.stringify(
                    this.lancamentosAtuais
                )
            );

            this.sincronizadoComNuvem =
                false;

            localStorage.setItem(
                'sincronizado_nuvem',
                'false'
            );

            this.render();
        }
    }

    // =====================================================
    // EDITAR LANÇAMENTO
    // =====================================================

    editarLancamento(index) {
        const reg =
            this.lancamentosAtuais[
                index
            ];

        if (!reg) return;

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

        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(
                this.lancamentosAtuais
            )
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
            this.obterLancamentosDaSemana();

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

        await this.storage.salvarSemana(
            semana
        );

        this.lancamentosAtuais =
            this.lancamentosAtuais.filter(
                reg =>
                    !lancamentosDaSemana.includes(
                        reg
                    )
            );

        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(
                this.lancamentosAtuais
            )
        );

        this.sincronizadoComNuvem =
            true;

        localStorage.setItem(
            'sincronizado_nuvem',
            'true'
        );

        this.render();

        alert(
            'Semana fechada com sucesso!'
        );
    }

    // =====================================================
    // GOOGLE SHEETS
    // =====================================================

    async obterOuCriarPlanilhaDrive() {
        const nomePlanilha =
            this.nomePlanilhaGoogle;

        const query =
            encodeURIComponent(
                `name = '${nomePlanilha}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
            );

        const searchRes =
            await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${query}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`
                    }
                }
            );

        const searchData =
            await searchRes.json();

        if (
            searchData.files &&
            searchData.files.length >
            0
        ) {
            const idEncontrado =
                searchData.files[0].id;

            this.spreadsheetIdSalvo =
                idEncontrado;

            localStorage.setItem(
                this.spreadsheetStorageKey,
                idEncontrado
            );

            return idEncontrado;
        }

        const createRes =
            await fetch(
                'https://sheets.googleapis.com/v4/spreadsheets',
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`,

                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        properties: {
                            title:
                                nomePlanilha
                        }
                    })
                }
            );

        const createData =
            await createRes.json();

        const spreadsheetId =
            createData.spreadsheetId;

        this.spreadsheetIdSalvo =
            spreadsheetId;

        localStorage.setItem(
            this.spreadsheetStorageKey,
            spreadsheetId
        );

        await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Página1!A1:E1?valueInputOption=USER_ENTERED`,
            {
                method: 'PUT',

                headers: {
                    Authorization:
                        `Bearer ${this.accessToken}`,

                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({
                    values: [
                        [
                            'Data do Lançamento',
                            'Descrição / Texto Bruto',
                            'Peças',
                            'Valor Unitário',
                            'Valor Total'
                        ]
                    ]
                })
            }
        );

        return spreadsheetId;
    }

    abrirPlanilhaNoNavegador() {
        if (!this.accessToken) {
            alert(
                'Conecte-se com o Google primeiro para acessar sua planilha.'
            );

            this.fazerLoginGoogle();

            return;
        }

        if (!this.spreadsheetIdSalvo) {
            this.obterOuCriarPlanilhaDrive()
                .then(
                    id => {
                        if (id) {
                            window.open(
                                `https://docs.google.com/spreadsheets/d/${id}/edit`,
                                '_blank'
                            );
                        }
                    }
                )
                .catch(
                    () => {
                        alert(
                            'Não foi possível localizar sua planilha no Drive. Tente sincronizar primeiro.'
                        );
                    }
                );

            return;
        }

        window.open(
            `https://docs.google.com/spreadsheets/d/${this.spreadsheetIdSalvo}/edit`,
            '_blank'
        );
    }

    async enviarParaGoogleSheetsAutomatico() {
        if (!this.accessToken) {
            alert(
                'Por favor, clique em "Entrar com o Google" antes de sincronizar.'
            );

            this.fazerLoginGoogle();

            return;
        }

        if (
            this.lancamentosAtuais.length ===
            0
        ) {
            alert(
                'Não há lançamentos atuais na tela para sincronizar.'
            );

            return;
        }

        const btnNuvem =
            document.getElementById(
                'btnEnviarNuvem'
            );

        try {
            if (btnNuvem) {
                btnNuvem.innerText =
                    'Sincronizando com o Drive...';
            }

            const spreadsheetId =
                await this.obterOuCriarPlanilhaDrive();

            const lancamentosDaSemana =
                this.obterLancamentosDaSemana();

            if (
                lancamentosDaSemana.length ===
                0
            ) {
                alert(
                    'Não há lançamentos na semana selecionada para sincronizar.'
                );

                return;
            }

            const lancamentosPendentes =
                lancamentosDaSemana.filter(
                    reg =>
                        reg.sincronizado !==
                        true
                );

            if (
                lancamentosPendentes.length ===
                0
            ) {
                alert(
                    'Todos os lançamentos da semana selecionada já estão sincronizados.'
                );

                return;
            }

            const linhasNovas =
                lancamentosPendentes.map(
                    reg => [
                        reg.data ||
                        new Date().toLocaleDateString(
                            'pt-BR'
                        ),

                        reg.textoBruto ||
                        reg.textoOriginal ||
                        '',

                        reg.pecas ||
                        0,

                        reg.valorUnitario ||
                        0,

                        reg.valorTotal ||
                        0
                    ]
                );

            const appendRes =
                await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Página1!A:E:append?valueInputOption=USER_ENTERED`,
                    {
                        method: 'POST',

                        headers: {
                            Authorization:
                                `Bearer ${this.accessToken}`,

                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            values:
                                linhasNovas
                        })
                    }
                );

            if (!appendRes.ok) {
                throw new Error(
                    'Falha ao gravar dados na planilha.'
                );
            }

            lancamentosPendentes.forEach(
                reg => {
                    reg.sincronizado =
                        true;
                }
            );

            localStorage.setItem(
                'temp_lancamentos',
                JSON.stringify(
                    this.lancamentosAtuais
                )
            );

            this.sincronizadoComNuvem =
                true;

            localStorage.setItem(
                'sincronizado_nuvem',
                'true'
            );

            this.render();

            alert(
                `Sincronizado com sucesso! ${lancamentosPendentes.length} lançamento(s) foram enviados para a planilha.`
            );

        } catch (e) {
            console.error(e);

            if (
                e.message.includes('401') ||
                e.message.includes('expired')
            ) {
                localStorage.removeItem(
                    'google_access_token'
                );

                this.accessToken =
                    null;

                this.atualizarInterfaceLogin(
                    false
                );

                alert(
                    'Sua sessão expirou. Por favor, entre com o Google novamente.'
                );

            } else {
                alert(
                    'Erro ao sincronizar com o Google Drive. Verifique sua conexão.'
                );
            }

        } finally {
            if (btnNuvem) {
                btnNuvem.innerText =
                    '🚀 Sincronizar com o Drive';
            }
        }
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

    atualizarBottomBar() {
        const status =
            document.getElementById(
                'bottomSyncStatus'
            );

        const label =
            document.getElementById(
                'bottomSyncLabel'
            );

        const btnSync =
            document.getElementById(
                'btnBottomSync'
            );

        if (
            !status ||
            !label ||
            !btnSync
        ) {
            return;
        }

        const conectado =
            !!this.accessToken;

        const lancamentosDaSemana =
            this.obterLancamentosDaSemana();

        const pendente =
            lancamentosDaSemana.some(
                reg =>
                    reg.sincronizado !== true
            );

        btnSync.classList.remove(
            'sincronizado',
            'pendente',
            'desconectado'
        );

        if (!conectado) {
            status.textContent =
                '⚪';

            label.textContent =
                'Google';

            btnSync.classList.add(
                'desconectado'
            );

            btnSync.title =
                'Conectar ao Google';

        } else if (pendente) {
            status.textContent =
                '🟡';

            label.textContent =
                'Pendente';

            btnSync.classList.add(
                'pendente'
            );

            btnSync.title =
                'Sincronizar lançamentos';

        } else {
            status.textContent =
                '🟢';

            label.textContent =
                'Sincronizado';

            btnSync.classList.add(
                'sincronizado'
            );

            btnSync.title =
                'Abrir planilha no Google';
        }
    }

    acaoBottomSync() {
        if (!this.accessToken) {
            this.fazerLoginGoogle();

            return;
        }

        const lancamentosDaSemana =
            this.obterLancamentosDaSemana();

        const existemLancamentosPendentes =
            lancamentosDaSemana.some(
                reg =>
                    reg.sincronizado !== true
            );

        if (
            existemLancamentosPendentes
        ) {
            this.enviarParaGoogleSheetsAutomatico();

            return;
        }

        this.abrirPlanilhaNoNavegador();
    }

    abrirMenuBottom() {
        const menuLateral =
            document.getElementById(
                'menuLateral'
            );

        const menuOverlay =
            document.getElementById(
                'menuOverlay'
            );

        if (menuLateral) {
            menuLateral.classList.add(
                'ativo'
            );
        }

        if (menuOverlay) {
            menuOverlay.classList.add(
                'ativo'
            );
        }
    }

    // =====================================================
    // RENDER
    // =====================================================

    async render() {
        const listaAtualEl =
            document.getElementById(
                'listaHistorico'
            );

        // =================================================
        // TOTAIS
        // =================================================

        let totalPecas = 0;
        let totalValor = 0;

        const lancamentosDaSemana =
            this.obterLancamentosDaSemana();

        lancamentosDaSemana.forEach(
            reg => {
                const textoBuscaRef =
                    (
                        reg.textoBruto ||
                        reg.textoOriginal ||
                        ''
                    ).toLowerCase();

                const dataRef =
                    (
                        reg.data ||
                        ''
                    ).toLowerCase();

                if (
                    this.termoBusca &&
                    !dataRef.includes(
                        this.termoBusca
                    ) &&
                    !textoBuscaRef.includes(
                        this.termoBusca
                    )
                ) {
                    return;
                }

                totalPecas +=
                    Number(
                        reg.pecas
                    ) || 0;

                totalValor +=
                    Number(
                        reg.valorTotal
                    ) || 0;
            }
        );

        // =================================================
        // BARRA DE META
        // =================================================

        const textoMetaEl =
            document.getElementById(
                'textoMetaProgresso'
            );

        const porcentagemEl =
            document.getElementById(
                'porcentagemMeta'
            );

        const barraEl =
            document.getElementById(
                'barraProgressoMeta'
            );

        if (
            textoMetaEl &&
            porcentagemEl &&
            barraEl
        ) {
            const progressoPorcentagem =
                this.metaSemanal > 0
                    ? (
                        totalValor /
                        this.metaSemanal
                    ) * 100
                    : 0;

            const porcentagemLimitada =
                Math.min(
                    progressoPorcentagem,
                    100
                );

            textoMetaEl.innerText =
                `R$ ${totalValor.toFixed(2)} / R$ ${this.metaSemanal.toFixed(2)}`;

            porcentagemEl.innerText =
                `${progressoPorcentagem.toFixed(0)}%`;

            barraEl.style.width =
                `${porcentagemLimitada}%`;

            if (
                progressoPorcentagem >= 100
            ) {
                barraEl.style.backgroundColor =
                    'var(--accent-color)';

                if (
                    !this.metaBatidaDisparada
                ) {
                    this.metaBatidaDisparada =
                        true;

                    localStorage.setItem(
                        'meta_batida_disparada',
                        'true'
                    );

                    setTimeout(
                        () => {
                            this.dispararAnimacaoMetaBatida();
                        },
                        100
                    );
                }

            } else {
                barraEl.style.backgroundColor =
                    'var(--accent-color)';

                this.metaBatidaDisparada =
                    false;

                localStorage.setItem(
                    'meta_batida_disparada',
                    'false'
                );
            }
        }

        // =================================================
        // LANÇAMENTOS ATUAIS
        // =================================================

        if (listaAtualEl) {
            let htmlAtuais = '';

            lancamentosDaSemana.forEach(
                reg => {
                    const index =
                        this.lancamentosAtuais.indexOf(
                            reg
                        );

                    const textoBuscaRef =
                        (
                            reg.textoBruto ||
                            reg.textoOriginal ||
                            ''
                        ).toLowerCase();

                    const dataRef =
                        (
                            reg.data ||
                            ''
                        ).toLowerCase();

                    if (
                        this.termoBusca &&
                        !dataRef.includes(
                            this.termoBusca
                        ) &&
                        !textoBuscaRef.includes(
                            this.termoBusca
                        )
                    ) {
                        return;
                    }

                    const detalhesList =
                        reg.detalhes
                            ? reg.detalhes
                                .map(
                                    d =>
                                        `<li>${d}</li>`
                                )
                                .join('')
                            : '';

                    htmlAtuais += `
                        <div
                            class="history-item"
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:flex-start;
                                padding:10px 0;
                                border-bottom:1px solid var(--border-color);
                            "
                        >
                            <div
                                style="
                                    flex:1;
                                    margin-right:8px;
                                "
                            >
                                <strong>${reg.data}</strong>
                                -
                                ${this.formatarNumero(reg.pecas)} pçs
                                (R$ ${Number(reg.valorTotal || 0).toFixed(2)})

                                <ul>
                                    ${detalhesList}
                                </ul>
                            </div>

                            <div
                                style="
                                    display:flex;
                                    gap:4px;
                                "
                            >
                                <button
                                    onclick="window.app.editarLancamento(${index})"
                                    title="Editar Lançamento"
                                    style="
                                        width:auto;
                                        padding:6px 8px;
                                        background:transparent;
                                        color:var(--warning-color);
                                        font-size:0.9rem;
                                        margin:0;
                                        cursor:pointer;
                                        border:none;
                                    "
                                >
                                    ✏️
                                </button>

                                <button
                                    onclick="window.app.removerLancamento(${index})"
                                    title="Excluir Lançamento"
                                    style="
                                        width:auto;
                                        padding:6px 8px;
                                        background:transparent;
                                        color:var(--danger-color);
                                        font-size:0.9rem;
                                        margin:0;
                                        cursor:pointer;
                                        border:none;
                                    "
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;
                }
            );

            listaAtualEl.innerHTML =
                htmlAtuais ||
                `
                    <p
                        style="
                            color:var(--muted-color);
                            text-align:center;
                            font-size:0.9rem;
                        "
                    >
                        Nenhum lançamento na semana atual.
                    </p>
                `;
        }

        // =================================================
        // TOTAIS GERAIS
        // =================================================

        const totalGeralValorEl =
            document.getElementById(
                'totalGeralValor'
            );

        const totalGeralPecasEl =
            document.getElementById(
                'totalGeralPecas'
            );

        if (totalGeralValorEl) {
            totalGeralValorEl.innerText =
                `R$ ${totalValor.toFixed(2)}`;
        }

        if (totalGeralPecasEl) {
            totalGeralPecasEl.innerText =
                this.formatarNumero(
                    totalPecas
                );
        }

        // =================================================
        // RESUMO SEMANAL POR VALOR UNITÁRIO
        // =================================================

        const resumoSemanalPrecoEl =
            document.getElementById(
                'resumoSemanalPreco'
            );

        if (resumoSemanalPrecoEl) {
            const gruposPorPreco = {};

            lancamentosDaSemana.forEach(
                reg => {
                    const valorUnitario =
                        Number(
                            reg.valorUnitario
                        ) || 0.21;

                    const chave =
                        valorUnitario.toFixed(
                            2
                        );

                    if (
                        !gruposPorPreco[
                            chave
                        ]
                    ) {
                        gruposPorPreco[
                            chave
                        ] = {
                            valorUnitario:
                                valorUnitario,

                            pecas: 0,

                            valor: 0,

                            lancamentos: []
                        };
                    }

                    const pecas =
                        Number(
                            reg.pecas
                        ) || 0;

                    const valorTotal =
                        Number(
                            reg.valorTotal
                        ) ||
                        (
                            pecas *
                            valorUnitario
                        );

                    gruposPorPreco[
                        chave
                    ].pecas +=
                        pecas;

                    gruposPorPreco[
                        chave
                    ].valor +=
                        valorTotal;

                    gruposPorPreco[
                        chave
                    ].lancamentos.push(
                        {
                            data:
                                reg.data ||
                                '',

                            pecas:
                                pecas,

                            valorTotal:
                                valorTotal,

                            texto:
                                reg.textoBruto ||
                                reg.textoOriginal ||
                                ''
                        }
                    );
                }
            );

            const chaves =
                Object.keys(
                    gruposPorPreco
                ).sort(
                    (a, b) =>
                        Number(a) -
                        Number(b)
                );

            if (
                chaves.length ===
                0
            ) {
                resumoSemanalPrecoEl.innerHTML =
                    '';

            } else {
                let htmlResumo = `
                    <div class="resumo-preco-titulo">
                        📦 Resumo por valor unitário
                    </div>
                `;

                chaves.forEach(
                    chave => {
                        const grupo =
                            gruposPorPreco[
                                chave
                            ];

                        htmlResumo += `
                            <div class="resumo-preco-grupo">

                                <div class="resumo-preco-grupo-titulo">
                                    💰 R$ ${grupo.valorUnitario.toFixed(2)}
                                    por peça
                                </div>
                        `;

                        grupo.lancamentos.forEach(
                            reg => {
                                htmlResumo += `
                                    <div class="resumo-preco-item">

                                        <span>
                                            ${reg.data}
                                            -
                                            ${this.formatarNumero(reg.pecas)}
                                            pçs
                                        </span>

                                        <span>
                                            R$ ${reg.valorTotal.toFixed(2)}
                                        </span>

                                    </div>
                                `;
                            }
                        );

                        htmlResumo += `
                                <div class="resumo-preco-total">

                                    <span>
                                        Total:
                                        ${this.formatarNumero(grupo.pecas)}
                                        pçs
                                    </span>

                                    <span>
                                        R$ ${grupo.valor.toFixed(2)}
                                    </span>

                                </div>

                            </div>
                        `;
                    }
                );

                resumoSemanalPrecoEl.innerHTML =
                    htmlResumo;
            }
        }

        // =================================================
        // SINCRONIZAÇÃO
        // =================================================

        const containerMenuSync =
            document.getElementById(
                'cardSincronizacaoMenu'
            );

        if (containerMenuSync) {
            let avisoEl =
                document.getElementById(
                    'avisoSyncPendenteMenu'
                );

            const existemLancamentosPendentes =
                lancamentosDaSemana.some(
                    reg =>
                        reg.sincronizado !==
                        true
                );

            if (
                existemLancamentosPendentes
            ) {
                if (!avisoEl) {
                    avisoEl =
                        document.createElement(
                            'div'
                        );

                    avisoEl.id =
                        'avisoSyncPendenteMenu';

                    avisoEl.style.cssText = `
                        background:rgba(255,152,0,0.15);
                        color:var(--warning-color);
                        padding:8px;
                        border-radius:6px;
                        font-size:0.8rem;
                        margin-bottom:10px;
                        text-align:center;
                        border:1px solid var(--warning-color);
                    `;

                    containerMenuSync.prepend(
                        avisoEl
                    );
                }

                avisoEl.innerText =
                    '⚠️ Há lançamentos pendentes de sincronização.';

            } else if (avisoEl) {
                avisoEl.remove();
            }

            // =================================================
            // BOTÃO PARA ABRIR A PLANILHA
            // =================================================

            let btnAbrirPlanilha =
                document.getElementById(
                    'btnAbrirPlanilhaDrive'
                );

            if (this.accessToken) {
                if (!btnAbrirPlanilha) {
                    btnAbrirPlanilha =
                        document.createElement(
                            'button'
                        );

                    btnAbrirPlanilha.id =
                        'btnAbrirPlanilhaDrive';

                    btnAbrirPlanilha.className =
                        'btn-backup';

                    btnAbrirPlanilha.style.cssText = `
                        background-color:#34a853;
                        color:white;
                        font-weight:bold;
                        width:100%;
                        margin-top:8px;
                    `;

                    btnAbrirPlanilha.innerHTML =
                        '📊 Ver Planilha no Google Drive';

                    btnAbrirPlanilha.onclick =
                        () =>
                            window.app.abrirPlanilhaNoNavegador();

                    containerMenuSync.appendChild(
                        btnAbrirPlanilha
                    );
                }

            } else if (
                btnAbrirPlanilha
            ) {
                btnAbrirPlanilha.remove();
            }
        }

        // =================================================
        // HISTÓRICO
        // =================================================

        const historicoEl =
            document.getElementById(
                'listaArquivo'
            );

        if (!historicoEl) {
            this.atualizarBottomBar();
            return;
        }

        const semanasSalvas =
            await this.storage.obterTodasSemanas();

        let htmlHistorico = '';

        // =================================================
        // RESUMO MENSAL
        // =================================================

        const resumoMensal = {};

        semanasSalvas.forEach(
            semana => {
                const partesPeriodo =
                    semana.periodo
                        ? semana.periodo.split(
                            ' '
                        )
                        : [];

                let mesAnoKey =
                    'Outros';

                if (
                    partesPeriodo.length >
                    0
                ) {
                    const dataInicioStr =
                        partesPeriodo[0];

                    const subPartes =
                        dataInicioStr.split(
                            '/'
                        );

                    if (
                        subPartes.length ===
                        3
                    ) {
                        const mesesNomes = [
                            'Janeiro',
                            'Fevereiro',
                            'Março',
                            'Abril',
                            'Maio',
                            'Junho',
                            'Julho',
                            'Agosto',
                            'Setembro',
                            'Outubro',
                            'Novembro',
                            'Dezembro'
                        ];

                        const mesIndex =
                            parseInt(
                                subPartes[1],
                                10
                            ) - 1;

                        if (
                            mesesNomes[
                                mesIndex
                            ]
                        ) {
                            mesAnoKey =
                                `${mesesNomes[mesIndex]} de ${subPartes[2]}`;
                        }
                    }
                }

                if (
                    !resumoMensal[
                        mesAnoKey
                    ]
                ) {
                    resumoMensal[
                        mesAnoKey
                    ] = {
                        valor: 0,
                        pecas: 0,
                        semanasCount: 0
                    };
                }

                resumoMensal[
                    mesAnoKey
                ].valor +=
                    semana.valorTotal ||
                    0;

                resumoMensal[
                    mesAnoKey
                ].pecas +=
                    semana.pecasTotal ||
                    0;

                resumoMensal[
                    mesAnoKey
                ].semanasCount +=
                    1;
            }
        );

        let htmlResumoMensal = '';

        Object.keys(
            resumoMensal
        ).forEach(
            mes => {
                const dados =
                    resumoMensal[
                        mes
                    ];

                htmlResumoMensal += `
                    <div
                        style="
                            background:rgba(33,150,243,0.1);
                            padding:8px 12px;
                            border-radius:6px;
                            margin-bottom:8px;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            font-size:0.9rem;
                        "
                    >
                        <div>
                            <strong
                                style="
                                    color:var(--info-color);
                                "
                            >
                                ${mes}
                            </strong>

                            <div
                                style="
                                    font-size:0.75rem;
                                    color:var(--muted-color);
                                "
                            >
                                ${dados.semanasCount}
                                semana(s) fechada(s)
                            </div>
                        </div>

                        <div
                            style="
                                text-align:right;
                            "
                        >
                            <span
                                style="
                                    color:var(--accent-color);
                                    font-weight:bold;
                                "
                            >
                                R$ ${dados.valor.toFixed(2)}
                            </span>

                            <div
                                style="
                                    font-size:0.75rem;
                                    color:var(--muted-color);
                                "
                            >
                                ${this.formatarNumero(dados.pecas)} pçs
                            </div>
                        </div>
                    </div>
                `;
            }
        );

        if (htmlResumoMensal) {
            htmlHistorico += `
                <div
                    style="
                        margin-bottom:16px;
                        border-bottom:1px solid var(--border-color);
                        padding-bottom:12px;
                    "
                >
                    <h4
                        style="
                            margin:0 0 8px 0;
                            font-size:0.9rem;
                            color:var(--text-color);
                        "
                    >
                        📊 Resumo por Mês
                    </h4>

                    ${htmlResumoMensal}
                </div>
            `;
        }

        // =================================================
        // SEMANAS SALVAS
        // =================================================

        semanasSalvas
            .sort(
                (a, b) =>
                    b.id - a.id
            )
            .forEach(
                semana => {
                    const semObj =
                        new SemanaProducao(
                            semana.registros
                        );

                    semObj.periodo =
                        semana.periodo;

                    semObj.pecasTotal =
                        semana.pecasTotal;

                    semObj.valorTotal =
                        semana.valorTotal;

                    let itensDetalhadosHtml =
                        '';

                    semana.registros.forEach(
                        reg => {
                            const valorReg =
                                reg.valorTotal ||
                                (
                                    reg.pecas *
                                    (
                                        reg.valorUnitario ||
                                        0.21
                                    )
                                );

                            const infoPreco =
                                reg.valorUnitario
                                    ? `
                                        <small
                                            style="
                                                color:var(--muted-color);
                                            "
                                        >
                                            (R$ ${reg.valorUnitario.toFixed(2)} un)
                                        </small>
                                    `
                                    : '';

                            const detalhesList =
                                reg.detalhes
                                    ? reg.detalhes
                                        .map(
                                            d =>
                                                `
                                                    <li
                                                        style="
                                                            font-size:0.85rem;
                                                            color:var(--muted-color);
                                                        "
                                                    >
                                                        ${d}
                                                    </li>
                                                `
                                        )
                                        .join('')
                                    : '';

                            itensDetalhadosHtml += `
                                <div
                                    style="
                                        padding:6px 0;
                                        border-bottom:1px solid var(--border-color);
                                    "
                                >
                                    <div
                                        style="
                                            display:flex;
                                            justify-content:space-between;
                                            font-size:0.9rem;
                                        "
                                    >
                                        <span>
                                            <strong>
                                                ${reg.data}
                                            </strong>
                                            -
                                            ${this.formatarNumero(reg.pecas)}
                                            pçs
                                            ${infoPreco}
                                        </span>

                                        <span
                                            style="
                                                color:var(--accent-color);
                                            "
                                        >
                                            R$ ${valorReg.toFixed(2)}
                                        </span>
                                    </div>

                                    <ul
                                        style="
                                            margin:2px 0 0 15px;
                                            padding:0;
                                        "
                                    >
                                        ${detalhesList}
                                    </ul>
                                </div>
                            `;
                        }
                    );

                    htmlHistorico += `
                        <div class="archive-box">
                            <details>
                                <summary
                                    style="
                                        cursor:pointer;
                                        display:flex;
                                        justify-content:space-between;
                                        align-items:center;
                                        font-weight:bold;
                                        outline:none;
                                        font-size:0.95rem;
                                    "
                                >
                                    <span>
                                        📅 ${semObj.periodo}
                                    </span>

                                    <span
                                        style="
                                            color:var(--accent-color);
                                        "
                                    >
                                        R$ ${semObj.valorTotal.toFixed(2)}
                                        (${this.formatarNumero(semObj.pecasTotal)} pçs)
                                    </span>
                                </summary>

                                <div
                                    style="
                                        margin-top:10px;
                                        border-top:1px solid var(--border-color);
                                        padding-top:8px;
                                    "
                                >
                                    ${itensDetalhadosHtml}

                                    <button
                                        class="btn-whatsapp"
                                        onclick="window.open('https://api.whatsapp.com/send?text=${encodeURIComponent(semObj.gerarMensagemWhatsApp())}', '_blank')"
                                    >
                                        📲 Enviar por WhatsApp
                                    </button>
                                </div>
                            </details>
                        </div>
                    `;
                }
            );

        // =================================================
        // MOSTRAR / OCULTAR ARQUIVO
        // =================================================

        const cardArquivo =
            document.getElementById(
                'cardArquivo'
            );

        if (cardArquivo) {
            cardArquivo.style.display =
                semanasSalvas.length
                    ? 'block'
                    : 'none';
        }

        historicoEl.innerHTML =
            htmlHistorico;

        // =================================================
        // BARRA INFERIOR
        // =================================================

        this.atualizarBottomBar();
    }
}

// =========================================================
// INICIALIZAÇÃO
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