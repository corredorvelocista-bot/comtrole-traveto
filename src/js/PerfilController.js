export class PerfilController {

    constructor() {
        this.chaves = {
            nome: 'perfil_nome',
            foto: 'perfil_foto',
            posicao: 'perfil_foto_posicao'
        };
    }


    obterNome() {
        return localStorage.getItem(
            this.chaves.nome
        );
    }


    salvarNome(nome) {
        localStorage.setItem(
            this.chaves.nome,
            nome
        );
    }


    obterFoto() {
        return localStorage.getItem(
            this.chaves.foto
        );
    }


    salvarFoto(foto) {
        localStorage.setItem(
            this.chaves.foto,
            foto
        );
    }


    obterPosicaoFoto() {
        const posicaoSalva =
            localStorage.getItem(
                this.chaves.posicao
            );

        if (!posicaoSalva) {
            return {
                x: 50,
                y: 50
            };
        }

        try {
            const posicao =
                JSON.parse(posicaoSalva);

            return {
                x: posicao.x ?? 50,
                y: posicao.y ?? 50
            };

        } catch {
            return {
                x: 50,
                y: 50
            };
        }
    }


    salvarPosicaoFoto(x, y) {
        localStorage.setItem(
            this.chaves.posicao,
            JSON.stringify({
                x,
                y
            })
        );
    }

    obterFoto(){
        return localStorage.getItem(
            this.chaves.foto
        );
    }

    salvarFoto(foto){
        localStorage.setItem(
            this.chaves.foto, foto
        );
    }
}
