import { supabase, supabaseConfigurado } from './SupabaseService.js';

export async function lerResumoDadosRemotos() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error('Supabase não está configurado.');
    }

    const {
        data: { user },
        error: erroUsuario
    } = await supabase.auth.getUser();

    if (erroUsuario) {
        throw erroUsuario;
    }

    if (!user) {
        throw new Error('É necessário entrar na conta antes de sincronizar.');
    }

    const { data, error } = await supabase
        .from('dados_usuario')
        .select('id, dados, atualizado_em')
        .eq('usuario_id', user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return {
            encontrado: false,
            categorias: [],
            mensagem: 'Ainda não existe registro remoto para esta conta.'
        };
    }

    const conteudo = data.dados;

    if (
        !conteudo ||
        typeof conteudo !== 'object' ||
        Array.isArray(conteudo)
    ) {
        throw new Error('O formato dos dados remotos é inválido.');
    }

    return {
        encontrado: true,
        categorias: Object.keys(conteudo),
        atualizadoEm: data.atualizado_em,
        quantidadeSemanas: Array.isArray(conteudo.semanasFechadas)
            ? conteudo.semanasFechadas.length
            : 0,
        quantidadeLancamentosAbertos: Array.isArray(conteudo.lancamentosAbertos)
            ? conteudo.lancamentosAbertos.length
            : 0,
        mensagem: 'Leitura remota concluída. Nenhum dado foi alterado.'
    };
}
