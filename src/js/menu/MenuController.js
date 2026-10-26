export class MenuController {
    constructor() {
        this.menuLateral = document.getElementById('menuLateral');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.telaInicio = document.getElementById('telaInicio');
        this.telaConfiguracoes = document.getElementById('telaConfiguracoes');
        this.telaProducao = document.getElementById('telaProducao');
        this.telaConfiguracoesInicio = document.getElementById('dashboardSettingsHome');
        this.telasConfiguracao = {
            producao: document.getElementById('dashboardSettingsProducao'),
            aparencia: document.getElementById('dashboardSettingsAparencia'),
            notificacoes: document.getElementById('dashboardSettingsNotificacoes'),
            dados: document.getElementById('dashboardSettingsDados'),
            sobre: document.getElementById('dashboardSettingsSobre')
        };

        this.moverConfiguracoesExistentes();
        this.vincularNavegacaoDashboard();

        // O menu lateral não faz mais parte da interface ativa.
        this.menuLateral?.remove();
        this.menuOverlay?.remove();
        this.menuLateral = null;
        this.menuOverlay = null;
    }

    moverConfiguracoesExistentes() {
        const destinos = {
            producao: document.getElementById('configuracoesConteudoProducao'),
            aparencia: document.getElementById('configuracoesConteudoAparencia'),
            notificacoes: document.getElementById('configuracoesConteudoNotificacoes'),
            dados: document.getElementById('configuracoesConteudoDados'),
            sobre: document.getElementById('configuracoesConteudoSobre')
        };

        const metaButton = document.getElementById('btnMenuMeta');
        const metaSection = metaButton?.parentElement;
        if (metaSection && destinos.producao && !destinos.producao.contains(metaSection)) {
            destinos.producao.appendChild(metaSection);
            const panel = document.getElementById('painelMenuMeta');
            if (panel) panel.classList.add('ativo');
            metaButton.setAttribute('aria-expanded', 'true');
        }

        const categorias = [
            ['btnConfigProducao', 'producao', 'painelConfigProducao'],
            ['btnConfigAparencia', 'aparencia', 'painelConfigAparencia'],
            ['btnConfigNotificacoes', 'notificacoes', 'painelConfigNotificacoes'],
            ['btnConfigDados', 'dados', 'painelConfigDados']
        ];

        categorias.forEach(([botaoId, destinoId, painelId]) => {
            const botao = document.getElementById(botaoId);
            const cartao = botao?.closest('.config-card');
            const destino = destinos[destinoId];
            if (cartao && destino && !destino.contains(cartao)) {
                destino.appendChild(cartao);
            }
            const painel = document.getElementById(painelId);
            if (painel) painel.classList.add('ativo');
            if (botao) botao.setAttribute('aria-expanded', 'true');
        });

        const sobreButton = document.getElementById('btnMenuSobre');
        const sobreSection = sobreButton?.parentElement;
        if (sobreSection && destinos.sobre && !destinos.sobre.contains(sobreSection)) {
            destinos.sobre.appendChild(sobreSection);
            const panel = document.getElementById('painelMenuSobre');
            if (panel) panel.classList.add('ativo');
            sobreButton.setAttribute('aria-expanded', 'true');
        }
    }

    vincularNavegacaoDashboard() {
        document.querySelectorAll('[data-action]').forEach((botao) => {
            botao.addEventListener('click', () => {
                switch (botao.dataset.action) {
                    case 'launch': this.abrirProducao(); break;
                    case 'history': window.location.href = './historico.html'; break;
                    case 'management': window.location.href = './gestao-financeira.html'; break;
                    case 'expenses': window.location.href = './despesas-pessoais.html'; break;
                    case 'settings': this.abrirTelaConfiguracoes(); break;
                    case 'reports': window.location.href = './relatorios.html'; break;
                    default: break;
                }
            });
        });

        document.querySelectorAll('[data-settings-page]').forEach((botao) => {
            botao.addEventListener('click', () => this.abrirSubtelaConfiguracao(botao.dataset.settingsPage));
        });
        document.querySelectorAll('[data-settings-back]').forEach((botao) => {
            botao.addEventListener('click', () => this.mostrarInicioConfiguracoes());
        });

        document.getElementById('helpBtn')?.addEventListener('click', () => {
            window.location.href = './ajuda.html';
        });
        document.getElementById('btnPerfilDashboard')?.addEventListener('click', () => {
            window.location.href = './perfil.html';
        });
        document.getElementById('btnVoltarInicioConfig')?.addEventListener('click', () => this.voltarInicio());
        document.getElementById('btnVoltarInicio')?.addEventListener('click', () => this.voltarInicio());
    }

    abrirProducao() {
        document.body.classList.remove('dashboard-active');
        if (this.telaInicio) this.telaInicio.hidden = true;
        if (this.telaConfiguracoes) this.telaConfiguracoes.hidden = true;
        if (this.telaProducao) this.telaProducao.style.display = 'block';
        this.fecharMenu();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    abrirTelaConfiguracoes() {
        document.body.classList.add('dashboard-active');
        if (this.telaInicio) this.telaInicio.hidden = true;
        if (this.telaInicio) this.telaInicio.style.display = 'none';
        if (this.telaProducao) this.telaProducao.style.display = 'none';
        if (this.telaConfiguracoes) {
            this.telaConfiguracoes.hidden = false;
            this.telaConfiguracoes.style.display = 'block';
        }
        this.mostrarInicioConfiguracoes();
        this.fecharMenu();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    mostrarInicioConfiguracoes() {
        if (this.telaConfiguracoesInicio) {
            this.telaConfiguracoesInicio.hidden = false;
            this.telaConfiguracoesInicio.style.display = 'block';
        }
        Object.values(this.telasConfiguracao).forEach((tela) => {
            if (tela) {
                tela.hidden = true;
                tela.style.display = 'none';
            }
        });
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    abrirSubtelaConfiguracao(nome) {
        const telaSelecionada = this.telasConfiguracao[nome];
        if (!telaSelecionada) return;
        if (this.telaConfiguracoes) {
            this.telaConfiguracoes.hidden = false;
            this.telaConfiguracoes.style.display = 'block';
        }
        if (this.telaConfiguracoesInicio) {
            this.telaConfiguracoesInicio.hidden = true;
            this.telaConfiguracoesInicio.style.display = 'none';
        }
        Object.entries(this.telasConfiguracao).forEach(([chave, tela]) => {
            if (!tela) return;
            const ativa = chave === nome;
            tela.hidden = !ativa;
            tela.style.display = ativa ? 'block' : 'none';
        });
        document.body.classList.add('dashboard-active');
        if (this.telaProducao) this.telaProducao.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    voltarInicio() {
        document.body.classList.add('dashboard-active');
        if (this.telaInicio) {
            this.telaInicio.hidden = false;
            this.telaInicio.style.display = 'block';
        }
        if (this.telaConfiguracoes) {
            this.telaConfiguracoes.hidden = true;
            this.telaConfiguracoes.style.display = 'none';
        }
        if (this.telaProducao) this.telaProducao.style.display = 'none';
        this.fecharMenu();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    abrirMenu() {
        if (this.menuLateral) this.menuLateral.classList.add('ativo');
        if (this.menuOverlay) this.menuOverlay.classList.add('ativo');
    }

    fecharMenu() {
        if (this.menuLateral) this.menuLateral.classList.remove('ativo');
        if (this.menuOverlay) this.menuOverlay.classList.remove('ativo');
    }

    abrirConfiguracao() {
        this.abrirTelaConfiguracoes();
    }
}
