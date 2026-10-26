export class GlobalAparenciaController {
    constructor() {
        this.CHAVE_TEMA = 'tema_aparencia';
        this.CHAVE_TEXTO = 'tamanho_texto';
        this.CHAVE_ANIMACOES = 'animacoes_ativas';

        // Escuta mudanças de tema do sistema operacional em tempo real (modo automático)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.obterTema() === 'automatico') {
                this.aplicarTema('automatico');
            }
        });

        // Sincroniza alterações feitas via localStorage em outras abas/páginas
        window.addEventListener('storage', (event) => {
            if (event.key === this.CHAVE_TEMA) {
                this.aplicarTema(event.newValue || 'claro');
            } else if (event.key === this.CHAVE_TEXTO) {
                this.aplicarTamanhoTexto(event.newValue || 'normal');
            } else if (event.key === this.CHAVE_ANIMACOES) {
                this.aplicarAnimacoes(event.newValue !== 'false');
            }
        });
    }

    // ==========================================
    // TEMA (Claro, Escuro, Automático)
    // ==========================================
    obterTema() {
        return localStorage.getItem(this.CHAVE_TEMA) || 'claro';
    }

    definirTema(tema) {
        localStorage.setItem(this.CHAVE_TEMA, tema);
        this.aplicarTema(tema);
    }

    aplicarTema(tema) {
        const root = document.documentElement;

        if (tema === 'claro') {
            root.setAttribute('data-theme', 'claro');
        } else if (tema === 'automatico') {
            const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (sistemaEscuro) {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', 'claro');
            }
        } else {
            // Escuro padrão
            root.removeAttribute('data-theme');
        }

        // Atualiza o select correspondente se existir na página atual
        const seletor = document.getElementById('configTema');
        if (seletor && seletor.value !== tema) {
            seletor.value = tema;
        }
    }

    // ==========================================
    // TAMANHO DO TEXTO (Pequeno, Normal, Grande)
    // ==========================================
    obterTamanhoTexto() {
        return localStorage.getItem(this.CHAVE_TEXTO) || 'normal';
    }

    definirTamanhoTexto(tamanho) {
        const validos = ['pequeno', 'normal', 'grande'];
        const valorFinal = validos.includes(tamanho) ? tamanho : 'normal';

        localStorage.setItem(this.CHAVE_TEXTO, valorFinal);
        this.aplicarTamanhoTexto(valorFinal);
    }

    aplicarTamanhoTexto(tamanho) {
        document.documentElement.setAttribute('data-text-size', tamanho);

        const seletor = document.getElementById('configTamanhoTexto');
        if (seletor && seletor.value !== tamanho) {
            seletor.value = tamanho;
        }
    }

    // ==========================================
    // ANIMAÇÕES (Ativadas / Desativadas)
    // ==========================================
    obterAnimacoes() {
        const valor = localStorage.getItem(this.CHAVE_ANIMACOES);
        return valor === null ? true : valor === 'true';
    }

    definirAnimacoes(ativadas) {
        localStorage.setItem(this.CHAVE_ANIMACOES, String(ativadas));
        this.aplicarAnimacoes(ativadas);
    }

    aplicarAnimacoes(ativadas) {
        document.documentElement.classList.toggle('sem-animacoes', !ativadas);

        const controle = document.getElementById('configAnimacoes');
        if (controle && controle.checked !== ativadas) {
            controle.checked = ativadas;
        }
    }

    // ==========================================
    // INICIALIZAR TODOS OS COMPONENTES E INPUTS
    // ==========================================
    inicializar() {
        // 1. Aplica os estados salvos imediatamente
        this.aplicarTema(this.obterTema());
        this.aplicarTamanhoTexto(this.obterTamanhoTexto());
        this.aplicarAnimacoes(this.obterAnimacoes());

        // 2. Vincula os elementos de interface caso existam na página atual
        const seletorTema = document.getElementById('configTema');
        if (seletorTema) {
            seletorTema.value = this.obterTema();
            seletorTema.addEventListener('change', (e) => {
                this.definirTema(e.target.value);
            });
        }

        const seletorTexto = document.getElementById('configTamanhoTexto');
        if (seletorTexto) {
            seletorTexto.value = this.obterTamanhoTexto();
            seletorTexto.addEventListener('change', (e) => {
                this.definirTamanhoTexto(e.target.value);
            });
        }

        const controleAnimacoes = document.getElementById('configAnimacoes');
        if (controleAnimacoes) {
            controleAnimacoes.checked = this.obterAnimacoes();
            controleAnimacoes.addEventListener('change', (e) => {
                this.definirAnimacoes(e.target.checked);
            });
        }
    }
}

// Inicialização automática global assim que o script for carregado
const aparenciaGlobal = new GlobalAparenciaController();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aparenciaGlobal.inicializar());
} else {
    aparenciaGlobal.inicializar();
}

