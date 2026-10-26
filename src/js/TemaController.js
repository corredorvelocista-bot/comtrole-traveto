export class TemaController {
    constructor() {
        this.chaveStorage =
            'tema_aparencia';

        this.tema =
            localStorage.getItem(
                this.chaveStorage
            ) || 'escuro';
    }

    obterTema() {
        return this.tema;
    }

    definirTema(tema) {
        this.tema = tema;

        localStorage.setItem(
            this.chaveStorage,
            this.tema
        );

        this.aplicar();
    }

    aplicar() {
        const tema =
            this.tema;

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
}