import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(
    supabaseUrl &&
    supabaseKey &&
    /^https:\/\/.+/.test(supabaseUrl)
);

export const supabase = supabaseConfigurado
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

export async function verificarConexaoSupabase() {
    if (!supabase) {
        return {
            ok: false,
            mensagem: 'Configuração Supabase ausente ou inválida.'
        };
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        return {
            ok: false,
            mensagem: error.message
        };
    }

    return {
        ok: true,
        mensagem: 'Cliente Supabase inicializado.',
        sessaoAtiva: Boolean(data.session)
    };
}
