export class MenuController {
    constructor() {
        this.menuLateral =
            document.getElementById(
                'menuLateral'
            );

        this.menuOverlay =
            document.getElementById(
                'menuOverlay'
            );
    }

    abrirMenu() {
        if (this.menuLateral) {
            this.menuLateral.classList.add(
                'ativo'
            );
        }

        if (this.menuOverlay) {
            this.menuOverlay.classList.add(
                'ativo'
            );
        }
    }

    fecharMenu() {
        if (this.menuLateral) {
            this.menuLateral.classList.remove(
                'ativo'
            );
        }

        if (this.menuOverlay) {
            this.menuOverlay.classList.remove(
                'ativo'
            );
        }
    }

    abrirConfiguracao() {
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
}