
        document.addEventListener(
            "DOMContentLoaded",
            () => {

                function configurarSecao(botaoId, painelId) {

                    const botao =
                        document.getElementById(botaoId);

                    const painel =
                        document.getElementById(painelId);

                    if (!botao || !painel) {
                        return;
                    }

                    botao.addEventListener(
                        "click",
                        () => {

                            const aberto =
                                painel.classList.toggle("ativo");

                            botao.classList.toggle(
                                "aberto",
                                aberto
                            );

                            botao.setAttribute(
                                "aria-expanded",
                                aberto ? "true" : "false"
                            );

                        }
                    );
                }

                /* =================================================
                   SEÇÕES DA CONFIGURAÇÃO
                ================================================= */

                configurarSecao(
                    "btnConfigGoogle",
                    "painelConfigGoogle"
                );

                configurarSecao(
                    "btnConfigProducao",
                    "painelConfigProducao"
                );

                configurarSecao(
                    "btnConfigAparencia",
                    "painelConfigAparencia"
                );

                configurarSecao(
                    "btnConfigMeta",
                    "painelConfigMeta"
                );

                configurarSecao(
                    "btnConfigNotificacoes",
                    "painelConfigNotificacoes"
                );

                configurarSecao(
                    "btnConfigDados",
                    "painelConfigDados"
                );

                configurarSecao(
                    "btnConfigSobre",
                    "painelConfigSobre"
                );

                /* =================================================
                   SEÇÕES PRINCIPAIS DO MENU
                ================================================= */

                configurarSecao(
                    "btnMenuGoogle",
                    "painelMenuGoogle"
                );

                configurarSecao(
                    "btnMenuMeta",
                    "painelMenuMeta"
                );

                configurarSecao(
                    "btnMenuAjuda",
                    "painelMenuAjuda"
                );

                /* =================================================
                   SINCRONIZA O ESTADO VISUAL DA CONFIGURAÇÃO
                   COM O APP.JS
                ================================================= */

                const painelConfiguracao =
                    document.getElementById(
                        "painelConfiguracao"
                    );

                const btnAbrirConfiguracao =
                    document.getElementById(
                        "btnAbrirConfiguracao"
                    );

                function atualizarEstadoConfiguracao() {

                    if (
                        !painelConfiguracao ||
                        !btnAbrirConfiguracao
                    ) {
                        return;
                    }

                    const aberto =
                        painelConfiguracao.classList.contains(
                            "ativo"
                        );

                    btnAbrirConfiguracao.classList.toggle(
                        "aberto",
                        aberto
                    );

                    btnAbrirConfiguracao.setAttribute(
                        "aria-expanded",
                        aberto ? "true" : "false"
                    );
                }

                if (painelConfiguracao) {

                    const observador =
                        new MutationObserver(
                            atualizarEstadoConfiguracao
                        );

                    observador.observe(
                        painelConfiguracao,
                        {
                            attributes: true,
                            attributeFilter: ["class"]
                        }
                    );

                    atualizarEstadoConfiguracao();
                }

                /* =================================================
                   AO VOLTAR DA CONFIGURAÇÃO,
                   FECHA AS SUBSEÇÕES
                ================================================= */

                const btnFecharConfiguracao =
                    document.getElementById(
                        "btnFecharConfiguracao"
                    );

                if (btnFecharConfiguracao) {

                    btnFecharConfiguracao.addEventListener(
                        "click",
                        () => {

                            const secoes = [

                                [
                                    "btnConfigGoogle",
                                    "painelConfigGoogle"
                                ],

                                [
                                    "btnConfigProducao",
                                    "painelConfigProducao"
                                ],

                                [
                                    "btnConfigMeta",
                                    "painelConfigMeta"
                                ],

                                [
                                    "btnConfigNotificacoes",
                                    "painelConfigNotificacoes"
                                ],

                                [
                                    "btnConfigDados",
                                    "painelConfigDados"
                                ],

                                [
                                    "btnConfigSobre",
                                    "painelConfigSobre"
                                ]

                            ];

                            secoes.forEach(
                                ([botaoId, painelId]) => {

                                    const botao =
                                        document.getElementById(
                                            botaoId
                                        );

                                    const painel =
                                        document.getElementById(
                                            painelId
                                        );

                                    if (botao && painel) {

                                        painel.classList.remove(
                                            "ativo"
                                        );

                                        botao.classList.remove(
                                            "aberto"
                                        );

                                        botao.setAttribute(
                                            "aria-expanded",
                                            "false"
                                        );

                                    }

                                }
                            );

                        }
                    );

                }

            }
        );

        (function () {

            const CHAVE_TAMANHO_TEXTO = 'tamanho_texto';
            const CHAVE_ANIMACOES = 'animacoes_ativas';

            function aplicarTamanhoTexto(valor) {

                const tamanhosValidos = [
                    'pequeno',
                    'normal',
                    'grande'
                ];

                const tamanho =
                    tamanhosValidos.includes(valor)
                        ? valor
                        : 'normal';

                document.documentElement.setAttribute(
                    'data-text-size',
                    tamanho
                );

                const seletor =
                    document.getElementById('configTamanhoTexto');

                if (seletor) {
                    seletor.value = tamanho;
                }

                localStorage.setItem(
                    CHAVE_TAMANHO_TEXTO,
                    tamanho
                );
            }

            function aplicarAnimacoes(valor) {

                const ativadas =
                    valor !== false;

                document.documentElement.classList.toggle(
                    'sem-animacoes',
                    !ativadas
                );

                const controle =
                    document.getElementById('configAnimacoes');

                if (controle) {
                    controle.checked = ativadas;
                }

                localStorage.setItem(
                    CHAVE_ANIMACOES,
                    String(ativadas)
                );
            }

            function inicializarAparencia() {

                const tamanhoSalvo =
                    localStorage.getItem(CHAVE_TAMANHO_TEXTO)
                    || 'normal';

                const animacoesSalvas =
                    localStorage.getItem(CHAVE_ANIMACOES);

                aplicarTamanhoTexto(tamanhoSalvo);

                aplicarAnimacoes(
                    animacoesSalvas === null
                        ? true
                        : animacoesSalvas === 'true'
                );

                const seletorTamanho =
                    document.getElementById('configTamanhoTexto');

                if (seletorTamanho) {

                    seletorTamanho.addEventListener(
                        'change',
                        function (event) {

                            aplicarTamanhoTexto(
                                event.target.value
                            );

                        }
                    );

                }

                const controleAnimacoes =
                    document.getElementById('configAnimacoes');

                if (controleAnimacoes) {

                    controleAnimacoes.addEventListener(
                        'change',
                        function (event) {

                            aplicarAnimacoes(
                                event.target.checked
                            );

                        }
                    );

                }

            }

            if (document.readyState === 'loading') {

                document.addEventListener(
                    'DOMContentLoaded',
                    inicializarAparencia,
                    { once: true }
                );

            } else {

                inicializarAparencia();

            }

        })();

        if ('serviceWorker' in navigator) {

            window.addEventListener(
                'load',
                async () => {

                    try {

                        const registration =
                            await navigator.serviceWorker.register(
                                '/sw.js'
                            );

                        console.log(
                            'Service Worker registrado:',
                            registration.scope
                        );

                    } catch (erro) {

                        console.error(
                            'Falha ao registrar Service Worker:',
                            erro
                        );

                    }

                }
            );

        }

