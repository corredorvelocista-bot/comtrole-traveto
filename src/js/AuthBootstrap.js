import {
    supabase,
    supabaseConfigurado
} from './SupabaseService.js';

const PAGINA_LOGIN = 'login.html';
const MAX_TENTATIVAS = 3;

function redirecionarParaLogin() {
    const destino = new URL(PAGINA_LOGIN, window.location.href);

    if (destino.href !== window.location.href) {
        window.location.replace(destino.href);
    }
}

function aguardar(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function mostrarErroDeAutenticacao() {
    let painel = document.getElementById('anotei-erro-autenticacao');

    if (painel) return;

    painel = document.createElement('section');
    painel.id = 'anotei-erro-autenticacao';

    Object.assign(painel.style, {
        maxWidth: '520px',
        margin: '48px auto',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '1.6',
        textAlign: 'center',
        border: '1px solid #d1d5db',
        borderRadius: '12px'
    });

    const titulo = document.createElement('h2');
    titulo.textContent = 'Não foi possível verificar sua sessão';

    const mensagem = document.createElement('p');
    mensagem.textContent =
        'Pode ser um problema de conexão. Sua sessão não foi ' +
        'confirmada como encerrada. Verifique a conexão e tente novamente.';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Tentar novamente';

    Object.assign(botao.style, {
        padding: '10px 18px',
        border: '0',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px'
    });

    botao.addEventListener('click', () => {
        window.location.reload();
    });

    painel.append(titulo, mensagem, botao);
    document.body.prepend(painel);
}

export async function verificarAcesso() {
    if (!supabaseConfigurado || !supabase) {
        console.error('Configuração do Supabase ausente ou inválida.');
        mostrarErroDeAutenticacao();
        return false;
    }

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error(
                    `Erro ao consultar sessão (${tentativa}/${MAX_TENTATIVAS}):`,
                    error
                );

                if (tentativa < MAX_TENTATIVAS) {
                    await aguardar(tentativa * 1000);
                    continue;
                }

                mostrarErroDeAutenticacao();
                return false;
            }

            if (!data?.session) {
                redirecionarParaLogin();
                return false;
            }

            return true;
        } catch (erro) {
            console.error(
                `Falha ao verificar sessão (${tentativa}/${MAX_TENTATIVAS}):`,
                erro
            );

            if (tentativa < MAX_TENTATIVAS) {
                await aguardar(tentativa * 1000);
                continue;
            }

            mostrarErroDeAutenticacao();
            return false;
        }
    }

    mostrarErroDeAutenticacao();
    return false;
}
