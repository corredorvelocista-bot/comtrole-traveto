// src/js/SupabaseService.js

import { createClient } from '@supabase/supabase-js';

export class SupabaseService {

    constructor() {

        const url =
            import.meta.env.VITE_SUPABASE_URL;

        const chave =
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!url || !chave) {

            console.warn(
                'Supabase não configurado. Sincronização desativada.'
            );

            this.supabase = null;

            return;
        }

        this.supabase =
            createClient(
                url,
                chave
            );
    }

    async entrarComGoogle() {

        if (!this.supabase) {
            return false;
        }

        const estaNoLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        const redirectTo =
            estaNoLocalhost
                ? 'http://localhost:5173/'
                : 'https://comtrole-traveto.vercel.app/';

        const {
            data,
            error
        } =
            await this.supabase.auth
                .signInWithOAuth({
                    provider: 'google',

                    options: {
                        redirectTo
                    }
                });

        if (error) {

            console.error(
                'Erro no login Google pelo Supabase:',
                error
            );

            return false;
        }

        return true;
    }

    async sairDoSupabase() {

        if (!this.supabase) {
            return false;
        }

        const {
            error
        } =
            await this.supabase.auth.signOut();

        if (error) {

            console.error(
                'Erro ao sair do Supabase:',
                error
            );

            return false;
        }

        return true;
    }

    async obterUsuarioAtual() {

        if (!this.supabase) {
            return null;
        }

        const {
            data,
            error
        } =
            await this.supabase.auth
                .getUser();

        if (error) {

            console.error(
                'Erro ao obter usuário Supabase:',
                error
            );

            return null;
        }

        return data?.user || null;
    }

    async obterSessaoAtual() {

        if (!this.supabase) {
            return null;
        }

        const {
            data,
            error
        } =
            await this.supabase.auth
                .getSession();

        if (error) {

            console.error(
                'Erro ao obter sessão Supabase:',
                error
            );

            return null;
        }

        return data?.session || null;
    }

    async salvarDadosUsuario(
        usuarioId,
        dados
    ) {

        if (!this.supabase) {
            return false;
        }

        const {
            error
        } =
            await this.supabase
                .from('dados_usuario')
                .upsert(
                    {
                        usuario_id: usuarioId,
                        dados: dados,
                        atualizado_em:
                            new Date().toISOString()
                    },
                    {
                        onConflict:
                            'usuario_id'
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

    async obterDadosUsuario(
        usuarioId
    ) {

        if (!this.supabase) {
            return null;
        }

        const {
            data,
            error
        } =
            await this.supabase
                .from('dados_usuario')
                .select('dados')
                .eq(
                    'usuario_id',
                    usuarioId
                )
                .maybeSingle();

        if (error) {

            console.error(
                'Erro ao obter dados do Supabase:',
                error
            );

            return null;
        }

        return data?.dados || null;
    }
}