import {
    supabase,
    supabaseConfigurado
} from './SupabaseService.js';

const PAGINA_LOGIN = 'login.html';

export async function obterSessaoAtual() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error(
            'Supabase não configurado. Confira o arquivo .env.local.'
        );
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    return data.session;
}

export async function exigirAutenticacao() {
    const sessao = await obterSessaoAtual();

    if (!sessao) {
        const destino = window.location.pathname.split('/').pop();

        if (destino && destino !== PAGINA_LOGIN) {
            window.location.replace(PAGINA_LOGIN);
        }

        return null;
    }

    return sessao;
}

export async function encerrarSessao() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error('Supabase não está configurado.');
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }

    window.location.replace(PAGINA_LOGIN);
}

export function observarSessao(callback) {
    if (!supabaseConfigurado || !supabase) {
        return () => {};
    }

    const {
        data: { subscription }
    } = supabase.auth.onAuthStateChange((evento, sessao) => {
        callback({ evento, sessao });
    });

    return () => subscription.unsubscribe();
}
