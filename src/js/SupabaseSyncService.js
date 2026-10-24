import { supabase, supabaseConfigurado } from './SupabaseService.js';

function obterProducao(conteudo) {
    // V1 canônica guarda a produção dentro de `producao`.
    // O formato legado guarda as listas diretamente na raiz de `dados`.
    if (conteudo?.producao && typeof conteudo.producao === 'object' && !Array.isArray(conteudo.producao)) {
        return {
            formato: Number.isInteger(conteudo.schemaVersion) ? 'canonico' : 'desconhecido-aninhado',
            producao: conteudo.producao
        };
    }
    return { formato: 'legado', producao: conteudo };
}

function contarLista(valor) {
    return Array.isArray(valor) ? valor.length : null;
}

export async function lerResumoDadosRemotos() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error('Supabase não está configurado.');
    }

    const {
        data: { user },
        error: erroUsuario
    } = await supabase.auth.getUser();

    if (erroUsuario) throw erroUsuario;
    if (!user) throw new Error('É necessário entrar na conta antes de sincronizar.');

    const { data, error } = await supabase
        .from('dados_usuario')
        .select('id, usuario_id, dados, atualizado_em')
        .eq('usuario_id', user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        return {
            encontrado: false,
            formato: null,
            categorias: [],
            quantidadeSemanas: 0,
            quantidadeLancamentosAbertos: 0,
            quantidadeDespesasPessoais: null,
            mensagem: 'Ainda não existe registro remoto para esta conta. Nenhum dado foi alterado.'
        };
    }

    if (data.usuario_id && data.usuario_id !== user.id) {
        throw new Error('O registro remoto não pertence à conta autenticada.');
    }

    const conteudo = data.dados;
    if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)) {
        throw new Error('O formato dos dados remotos é inválido.');
    }

    const { formato, producao } = obterProducao(conteudo);
    const semanas = contarLista(producao?.semanasFechadas);
    const lancamentos = contarLista(producao?.lancamentosAbertos);
    const despesas = contarLista(conteudo.despesasPessoais);

    return {
        encontrado: true,
        formato,
        schemaVersion: Number.isInteger(conteudo.schemaVersion) ? conteudo.schemaVersion : null,
        categorias: Object.keys(conteudo),
        atualizadoEm: data.atualizado_em,
        quantidadeSemanas: semanas,
        quantidadeLancamentosAbertos: lancamentos,
        quantidadeDespesasPessoais: despesas,
        mensagem: formato === 'legado'
            ? 'Leitura remota concluída. O registro está em formato legado; nenhuma migração ou gravação foi realizada.'
            : 'Leitura remota concluída. Nenhum dado foi alterado.'
    };
}
