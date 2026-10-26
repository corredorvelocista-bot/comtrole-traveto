import {
    supabase,
    supabaseConfigurado
} from './SupabaseService.js';

async function exigirUsuario() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!data.user) {
        throw new Error('É necessário entrar na conta.');
    }

    return data.user;
}

async function lerRegistro(tabela, colunas) {
    const usuario = await exigirUsuario();

    const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .eq('usuario_id', usuario.id)
        .maybeSingle();

    if (error) throw error;

    return data;
}

export async function obterPerfilRemoto() {
    return lerRegistro(
        'perfis',
        'usuario_id, nome, foto_ref, foto_posicao, criado_em, atualizado_em'
    );
}

export async function obterConfiguracoesRemotas() {
    return lerRegistro(
        'configuracoes_usuario',
        'usuario_id, valores, versao, atualizado_em'
    );
}

export async function salvarPerfilRemoto(alteracoes) {
    const usuario = await exigirUsuario();

    const permitidos = ['nome', 'foto_ref', 'foto_posicao'];
    const dados = Object.fromEntries(
        Object.entries(alteracoes).filter(([chave]) =>
            permitidos.includes(chave)
        )
    );

    if (Object.keys(dados).length === 0) {
        throw new Error('Nenhum campo válido de perfil foi informado.');
    }

    const { data, error } = await supabase
        .from('perfis')
        .upsert(
            { usuario_id: usuario.id, ...dados },
            { onConflict: 'usuario_id' }
        )
        .select()
        .single();

    if (error) throw error;

    return data;
}

export async function salvarConfiguracoesRemotas(alteracoes) {
    if (
        !alteracoes ||
        typeof alteracoes !== 'object' ||
        Array.isArray(alteracoes)
    ) {
        throw new Error('As configurações precisam ser um objeto.');
    }

    const usuario = await exigirUsuario();

    // Mantém os valores já existentes no banco que não forem alterados.
    const atual = await obterConfiguracoesRemotas();
    const valoresAtuais =
        atual?.valores &&
        typeof atual.valores === 'object' &&
        !Array.isArray(atual.valores)
            ? atual.valores
            : {};

    const valores = { ...valoresAtuais, ...alteracoes };

    const { data, error } = await supabase
        .from('configuracoes_usuario')
        .upsert(
            {
                usuario_id: usuario.id,
                valores,
                versao: (Number(atual?.versao) || 0) + 1
            },
            { onConflict: 'usuario_id' }
        )
        .select('usuario_id, valores, versao, atualizado_em')
        .single();

    if (error) throw error;

    return data;
}

export async function listarSemanasRemotas() {
    const usuario = await exigirUsuario();

    const { data, error } = await supabase
        .from('semanas_producao')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('data_inicio', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return data ?? [];
}

export async function listarLancamentosRemotos() {
    const usuario = await exigirUsuario();

    const { data, error } = await supabase
        .from('lancamentos_producao')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('criado_em', { ascending: false });

    if (error) throw error;

    return data ?? [];
}

export async function listarDespesasRemotas() {
    const usuario = await exigirUsuario();

    const { data, error } = await supabase
        .from('anotei_despesas_pessoais')
        .select('*')
        .eq('usuario_id', usuario.id)
        .order('criado_em', { ascending: false });

    if (error) throw error;

    return data ?? [];
}
