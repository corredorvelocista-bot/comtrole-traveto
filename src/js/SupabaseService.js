import { createClient } from '@supabase/supabase-js';

export class SupabaseService {

    constructor() {

        const url =
            import.meta.env.VITE_SUPABASE_URL;

        const chave =
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        this.supabase =
            createClient(
                url,
                chave
            );
    }

    async obterUsuarioAtual() {
        const {
            data,
            error
        } =
            await this.supabase.auth.getUser();

        if (error) {
            console.error(
                'Erro ao obter usuário Supabase:',
                error
            );
            return null;
        }
        return data.user;
    }

    async salvarDadosUsuario(usuarioId, dados) {

        const { error } =
            await this.supabase
                .from('dados_usuario')
                .upsert(
                    {
                        usuario_id: usuarioId,
                        dados: dados,
                        atualizado_em: new Date().toISOString()
                    },
                    {
                        onConflict: 'usuario_id'
                    }
                );

        if (error) {
            console.error(
                'Erro ao salvar dados no Supabase:',
                error
            );

            return false;
        }

        return true;
    }

    async obterDadosUsuario(usuarioId) {

        const { data, error } =
            await this.supabase
                .from('dados_usuario')
                .select('dados')
                .eq('usuario_id', usuarioId)
                .maybeSingle();

        if (error) {
            console.error(
                'Erro ao obter dados do Supabase:',
                error
            );

            return null;
        }

        return data?.dados ?? null;
    }


}