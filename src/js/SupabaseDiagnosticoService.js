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

    const [
        semanasLocais,
        respostaRemota
    ] = await Promise.all([
        storage.obterTodasSemanas(),
        supabase
            .from('dados_usuario')
            .select('dados, atualizado_em')
            .eq('usuario_id', user.id)
            .maybeSingle()
    ]);

    if (respostaRemota.error) throw respostaRemota.error;

    const remoto = respostaRemota.data?.dados ?? null;
    const lancamentosLocais = lerJSON('temp_lancamentos', []);
    const despesasLocais = despesas.obterTodas();

    const resumoLocal = {
        perfil: {
            nomeDefinido: Boolean(perfil.obterNome()),
            fotoDefinida: Boolean(perfil.obterFoto())
        },
        configuracoes: Object.keys(configuracao.obterTodas()),
        semanas: Array.isArray(semanasLocais) ? semanasLocais.length : 0,
        lancamentosAbertos: Array.isArray(lancamentosLocais)
            ? lancamentosLocais.length
            : 0,
        despesasPessoais: despesasLocais.length
    };

    const resumoRemoto = remoto ? {
        categorias: Object.keys(remoto),
        perfil: remoto.perfil && typeof remoto.perfil === 'object'
            ? Object.keys(remoto.perfil)
            : [],
        configuracoes: remoto.configuracoes &&
            typeof remoto.configuracoes === 'object'
            ? Object.keys(remoto.configuracoes)
            : [],
        semanasFechadas: Array.isArray(remoto.semanasFechadas)
            ? remoto.semanasFechadas.length
            : 0,
        lancamentosAbertos: Array.isArray(remoto.lancamentosAbertos)
            ? remoto.lancamentosAbertos.length
            : 0,
        atualizadoEm: respostaRemota.data.atualizado_em
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
            'As despesas pessoais locais ainda precisam de um mapeamento remoto.'
        ]
    };
}
