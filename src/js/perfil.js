import { PerfilController } from './PerfilController.js';

const perfilController =
    new PerfilController();
const campoNome =
    document.getElementById('campoNome');

const perfilNome =
    document.getElementById('perfilNome');

const btnSalvarNome =
    document.getElementById('btnSalvarNome');

const btnVoltar =
    document.getElementById('btnVoltarPerfil');

const campoFoto =
    document.getElementById('campoFoto');

const perfilFoto =
    document.getElementById('perfilFoto');


// ========================================
// NOME DO PERFIL
// ========================================

function carregarNome() {
    const nomeSalvo =
        perfilController.obterNome();

    if (nomeSalvo) {
        perfilNome.textContent =
            nomeSalvo;

        campoNome.value =
            nomeSalvo;
    }
}

if (btnSalvarNome) {
    btnSalvarNome.addEventListener(
        'click',
        () => {
            const nome =
                campoNome.value.trim();

            if (!nome) {
                return;
            }

            perfilController.salvarNome(
                nome
            );

            perfilNome.textContent =
                nome;
        }
    );
}

carregarNome();


// ========================================
// BOTÃO VOLTAR
// ========================================

if (btnVoltar) {
    btnVoltar.addEventListener(
        'click',
        () => {
            window.location.href =
                'index.html';
        }
    );
}


// ========================================
// FOTO DO PERFIL
// ========================================

let posicaoX = 50;
let posicaoY = 50;

let arrastandoFoto = false;

let inicioX = 0;
let inicioY = 0;


// ========================================
// CARREGAR POSIÇÃO SALVA
// ========================================

const posicao =
    perfilController.obterPosicaoFoto();

posicaoX =
    posicao.x;

posicaoY =
    posicao.y;


// ========================================
// APLICAR POSIÇÃO DA FOTO
// ========================================

function aplicarPosicaoFoto() {
    perfilFoto.style.backgroundPosition =
        `${posicaoX}% ${posicaoY}%`;
}

aplicarPosicaoFoto();


// ========================================
// ARRASTAR FOTO
// ========================================

if (perfilFoto) {

    perfilFoto.addEventListener(
        'pointerdown',
        (event) => {

            arrastandoFoto = true;

            inicioX =
                event.clientX;

            inicioY =
                event.clientY;

            perfilFoto.setPointerCapture(
                event.pointerId
            );
        }
    );


    perfilFoto.addEventListener(
        'pointermove',
        (event) => {

            if (!arrastandoFoto) {
                return;
            }

            const deslocamentoX =
                event.clientX - inicioX;

            const deslocamentoY =
                event.clientY - inicioY;


            posicaoX +=
                deslocamentoX * 0.5;

            posicaoY +=
                deslocamentoY * 0.5;


            posicaoX =
                Math.max(
                    0,
                    Math.min(
                        100,
                        posicaoX
                    )
                );

            posicaoY =
                Math.max(
                    0,
                    Math.min(
                        100,
                        posicaoY
                    )
                );


            aplicarPosicaoFoto();


            perfilController.salvarPosicaoFoto(
                posicaoX,
                posicaoY
            );


            inicioX =
                event.clientX;

            inicioY =
                event.clientY;
        }
    );


    perfilFoto.addEventListener(
        'pointerup',
        (event) => {

            arrastandoFoto = false;

            if (
                perfilFoto.hasPointerCapture(
                    event.pointerId
                )
            ) {
                perfilFoto.releasePointerCapture(
                    event.pointerId
                );
            }
        }
    );


    perfilFoto.addEventListener(
        'pointercancel',
        () => {
            arrastandoFoto = false;
        }
    );
}


// ========================================
// ESCOLHER NOVA FOTO
// ========================================

if (campoFoto) {

    campoFoto.addEventListener(
        'change',
        () => {

            const arquivo =
                campoFoto.files[0];

            if (!arquivo) {
                return;
            }


            const leitor =
                new FileReader();


            leitor.onload = () => {

                const foto =
                    leitor.result;


                perfilFoto.style.backgroundImage =
                    `url("${foto}")`;

                perfilFoto.style.color =
                    'transparent';


                // Volta o enquadramento
                // para o centro ao escolher
                // uma nova foto.

                posicaoX = 50;
                posicaoY = 50;

                aplicarPosicaoFoto();


                perfilController.salvarFoto(
                    foto
                );


                perfilController.salvarPosicaoFoto(
                    50,
                    50
                );
            };


            leitor.readAsDataURL(
                arquivo
            );
        }
    );
}


// ========================================
// CARREGAR FOTO SALVA
// ========================================

const fotoSalva =
    perfilController.obterFoto();

if (fotoSalva) {

    perfilFoto.style.backgroundImage =
        `url("${fotoSalva}")`;

    perfilFoto.style.color =
        'transparent';

    aplicarPosicaoFoto();
}