import {
    supabase,
    supabaseConfigurado
} from './SupabaseService.js';

const PAGINA_LOGIN = 'login.html';

export async function verificarAcesso() {
    if (!supabaseConfigurado || !supabase) {
        window.location.replace(
            new URL(PAGINA_LOGIN, window.location.href).href
        );
        return false;
    }

    try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            window.location.replace(
                new URL(PAGINA_LOGIN, window.location.href).href
            );
            return false;
        }

        return true;
    } catch (erro) {
        console.error('Falha ao verificar autenticação:', erro);

        window.location.replace(
            new URL(PAGINA_LOGIN, window.location.href).href
        );

        return false;
    }
}
