import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(
    supabaseUrl &&
    supabaseKey &&
    /^https:\/\/.+/.test(supabaseUrl) &&
    !supabaseUrl.includes('sua-instancia.supabase.co')
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
            mensagem: 'Configuração Supabase ausente ou inválida. Verifique o arquivo .env.'
        };
    }

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        return {
            ok: true,
            mensagem: 'Cliente Supabase conectado com sucesso.',
            sessaoAtiva: Boolean(data.session)
        };
    } catch (err) {
        return {
            ok: false,
            mensagem: err.message || 'Erro ao comunicar com o servidor Supabase.'
        };
    }
}
