import { supabase, supabaseConfigurado } from './SupabaseService.js';
import { ConfiguracaoService } from './ConfiguracaoService.js';
import { PerfilController } from './PerfilController.js';
import { StorageService } from './StorageService.js';
import { DespesasPessoaisService } from './DespesasPessoaisService.js';

function lerJSON(chave, padrao) {
    try {
        const valor = localStorage.getItem(chave);
        return valor === null ? padrao : JSON.parse(valor);
    } catch {
        return padrao;
    }
}

function obterProducaoRemota(remoto) {
    if (remoto?.producao && typeof remoto.producao === 'object' && !Array.isArray(remoto.producao)) {
        return {
            formato: Number.isInteger(remoto.schemaVersion) ? 'canonico' : 'desconhecido-aninhado',
            producao: remoto.producao
        };
    }
    return { formato: remoto ? 'legado' : null, producao: remoto };
}

function contarLista(valor) {
    // null significa que o campo não existe/não foi mapeado; 0 significa lista vazia.
    return Array.isArray(valor) ? valor.length : null;
}

export async function diagnosticarDadosLocaisERemotos() {
    if (!supabaseConfigurado || !supabase) {
        throw new Error('Supabase não está configurado.');
    }

    const {
        data: { user },
        error: erroUsuario
    } = await supabase.auth.getUser();
    if (erroUsuario) throw erroUsuario;
    if (!user) throw new Error('É necessário entrar na conta.');

    const storage = new StorageService();
    const configuracao = new ConfiguracaoService();
    const perfil = new PerfilController();
    const despesas = new DespesasPessoaisService();

    const [semanasLocais, respostaRemota] = await Promise.all([
        storage.obterTodasSemanas(),
        supabase
            .from('dados_usuario')
            .select('usuario_id, dados, atualizado_em')
            .eq('usuario_id', user.id)
            .maybeSingle()
    ]);

    if (respostaRemota.error) throw respostaRemota.error;
    const registro = respostaRemota.data ?? null;
    if (registro?.usuario_id && registro.usuario_id !== user.id) {
        throw new Error('O registro remoto não pertence à conta autenticada.');
    }

    const remoto = registro?.dados ?? null;
    const { formato, producao } = obterProducaoRemota(remoto);
    const lancamentosLocais = lerJSON('temp_lancamentos', []);
    const despesasLocais = despesas.obterTodas();

    const resumoLocal = {
        perfil: {
            nomeDefinido: Boolean(perfil.obterNome()),
            fotoDefinida: Boolean(perfil.obterFoto())
        },
        configuracoes: Object.keys(configuracao.obterTodas()),
        semanas: Array.isArray(semanasLocais) ? semanasLocais.length : null,
        lancamentosAbertos: Array.isArray(lancamentosLocais) ? lancamentosLocais.length : null,
        despesasPessoais: Array.isArray(despesasLocais) ? despesasLocais.length : null
    };

    const resumoRemoto = remoto ? {
        formato,
        schemaVersion: Number.isInteger(remoto.schemaVersion) ? remoto.schemaVersion : null,
        categorias: Object.keys(remoto),
        perfil: remoto.perfil && typeof remoto.perfil === 'object'
            ? Object.keys(remoto.perfil)
            : [],
        configuracoes: remoto.configuracoes && typeof remoto.configuracoes === 'object'
            ? Object.keys(remoto.configuracoes)
            : [],
        semanasFechadas: contarLista(producao?.semanasFechadas),
        lancamentosAbertos: contarLista(producao?.lancamentosAbertos),
        despesasPessoais: contarLista(remoto.despesasPessoais),
        atualizadoEm: registro.atualizado_em
    } : null;

    return {
        modo: 'somente leitura',
        usuarioAutenticado: true,
        existeRegistroRemoto: Boolean(remoto),
        local: resumoLocal,
        remoto: resumoRemoto,
        observacoes: [
            'Nenhum dado foi alterado.',
            'A quantidade de registros não garante que o conteúdo seja igual.',
            'Registros legados são reconhecidos, mas não são migrados automaticamente.',
            'Campo null significa que a lista não existe nesse formato; não deve ser interpretado como lista vazia.',
            'A comparação por identificadores e conteúdo ainda é necessária antes de qualquer gravação.'
        ]
    };
}
