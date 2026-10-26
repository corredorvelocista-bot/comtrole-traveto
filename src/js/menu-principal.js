/* Navegação do painel inicial. Mantém as funções e os dados do app atual. */
(() => {
    const formatarTexto = (elemento, fallback = '—') => {
        const texto = elemento?.textContent?.trim();
        return texto || fallback;
    };

    function atualizarResumoPainel() {
        const valor = document.getElementById('totalGeralValor');
        const pecas = document.getElementById('totalGeralPecas');
        const metaTexto = document.getElementById('textoMetaProgresso');
        const percentual = document.getElementById('porcentagemMeta');
        const valorDestino = document.getElementById('dashboardSemanaValor');
        const pecasDestino = document.getElementById('dashboardSemanaPecas');
        const metaDestino = document.getElementById('dashboardMetaTexto');
        const percentualDestino = document.getElementById('dashboardMetaPercentual');
        const barra = document.getElementById('dashboardMetaPreenchimento');
        const barraContainer = document.getElementById('dashboardMetaBarra');

        if (valorDestino) valorDestino.textContent = formatarTexto(valor, 'R$ 0,00');
        if (pecasDestino) pecasDestino.textContent = formatarTexto(pecas, '0');
        if (metaDestino) metaDestino.textContent = formatarTexto(metaTexto, 'R$ 0,00 / R$ 0,00');

        const textoPercentual = formatarTexto(percentual, '0%');
        const numero = Number((textoPercentual.match(/[\d.,]+/) || ['0'])[0].replace(',', '.'));
        const limitado = Number.isFinite(numero) ? Math.max(0, Math.min(100, numero)) : 0;
        if (percentualDestino) percentualDestino.textContent = `${textoPercentual} da meta`;
        if (barra) barra.style.width = `${limitado}%`;
        if (barraContainer) barraContainer.setAttribute('aria-valuenow', String(limitado));
    }

    function mostrarProducao() {
        document.body.dataset.view = 'production';
        window.scrollTo({ top: 0, behavior: 'instant' });
        atualizarResumoPainel();
        const campo = document.getElementById('textoProducao');
        if (campo) window.setTimeout(() => campo.focus({ preventScroll: true }), 120);
    }

    function mostrarPainelInicial() {
        document.body.dataset.view = 'dashboard';
        window.scrollTo({ top: 0, behavior: 'instant' });
        atualizarResumoPainel();
    }

    function abrirConfiguracoes() {
        window.app?.menuController?.abrirTelaConfiguracoes();
    }

    function configurarNavegacao() {
        document.querySelectorAll('[data-action]').forEach((botao) => {
            botao.addEventListener('click', () => {
                switch (botao.dataset.action) {
                    case 'launch':
                        mostrarProducao();
                        break;
                    case 'history':
                        window.location.href = 'historico.html';
                        break;
                    case 'management':
                        window.location.href = 'gestao-financeira.html';
                        break;
                    case 'expenses':
                        window.location.href = 'despesas-pessoais.html';
                        break;
                    case 'reports':
                        window.location.href = 'relatorios.html';
                        break;
                    case 'settings':
                        abrirConfiguracoes();
                        break;
                    default:
                        break;
                }
            });
        });

        document.getElementById('btnBottomHome')?.addEventListener('click', mostrarPainelInicial);
        document.getElementById('btnAjudaPainel')?.addEventListener('click', () => {
            window.location.href = 'ajuda.html';
        });
        document.getElementById('btnPerfilPainel')?.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });
        document.getElementById('btnFecharMenu')?.addEventListener('click', () => {
            window.app?.menuController?.fecharMenu();
            document.getElementById('menuLateral')?.classList.remove('ativo');
            document.getElementById('menuOverlay')?.classList.remove('ativo');
        });
    }

    function observarDadosReais() {
        atualizarResumoPainel();
        const ids = ['totalGeralValor', 'totalGeralPecas', 'textoMetaProgresso', 'porcentagemMeta'];
        const observador = new MutationObserver(atualizarResumoPainel);
        ids.forEach((id) => {
            const elemento = document.getElementById(id);
            if (elemento) observador.observe(elemento, { childList: true, subtree: true, characterData: true });
        });
        // O render principal atualiza o resumo de forma assíncrona; esta leitura inicial cobre a primeira renderização.
        window.setTimeout(atualizarResumoPainel, 250);
        window.setTimeout(atualizarResumoPainel, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            configurarNavegacao();
            observarDadosReais();
        }, { once: true });
    } else {
        configurarNavegacao();
        observarDadosReais();
    }
})();
