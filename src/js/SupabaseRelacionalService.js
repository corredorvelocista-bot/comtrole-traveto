import { supabase, supabaseConfigurado } from './SupabaseService.js';

const numeroNaoNegativo = (valor, campo) => {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero) || numero < 0) throw new TypeError(`${campo} precisa ser um número não negativo.`);
  return numero;
};
const dataISO = valor => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
const idOrigem = valor => valor === undefined || valor === null || String(valor).trim() === '' ? null : String(valor);

export class SupabaseRelacionalService {
  exigirCliente() {
    if (!supabaseConfigurado || !supabase) throw new Error('Supabase não está configurado. Confira VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
    return supabase;
  }

  async obterUsuarioAtual() {
    const { data, error } = await this.exigirCliente().auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('É necessário entrar na conta do Anotei.');
    return data.user;
  }

  async obterPerfil() {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const { data, error } = await client.from('perfis').select('usuario_id,nome,foto_ref,foto_posicao,criado_em,atualizado_em').eq('usuario_id', user.id).maybeSingle();
    if (error) throw error; return data;
  }

  async salvarPerfil(perfil) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const registro = { usuario_id: user.id, nome: perfil?.nome ?? null, foto_ref: perfil?.fotoRef ?? null, foto_posicao: perfil?.fotoPosicao && typeof perfil.fotoPosicao === 'object' ? perfil.fotoPosicao : {} };
    const { data, error } = await client.from('perfis').upsert(registro, { onConflict: 'usuario_id' }).select('usuario_id,nome,foto_ref,foto_posicao,atualizado_em').single();
    if (error) throw error; return data;
  }

  async obterConfiguracoes() {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const { data, error } = await client.from('configuracoes_usuario').select('usuario_id,valores,versao,atualizado_em').eq('usuario_id', user.id).maybeSingle();
    if (error) throw error; return data;
  }

  // A RPC faz compare-and-swap atômico para impedir que um dispositivo sobrescreva silenciosamente outro.
  async salvarConfiguracoes(valores, expectedVersion = undefined) {
    if (!valores || typeof valores !== 'object' || Array.isArray(valores)) throw new TypeError('As configurações precisam ser um objeto.');
    const atual = await this.obterConfiguracoes();
    const versaoEsperada = expectedVersion === undefined ? (atual?.versao ?? null) : expectedVersion;
    const mesclados = { ...(atual?.valores ?? {}), ...valores };
    const { data, error } = await this.exigirCliente().rpc('anotei_salvar_configuracoes_condicional', { p_valores: mesclados, p_versao_esperada: versaoEsperada });
    if (error) {
      if (error.code === 'P0001' || /conflito|versão|versao/i.test(error.message || '')) {
        const conflito = new Error('Conflito de sincronização: as configurações mudaram em outro dispositivo. Releia os dados antes de tentar novamente.');
        conflito.code = 'ANOTEI_CONFLICT'; conflito.cause = error; throw conflito;
      }
      throw error;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  async assinarAlteracoesLancamentos(callback) {
    const client = this.exigirCliente();
    const user = await this.obterUsuarioAtual();
    const channel = client
      .channel(`anotei-lancamentos-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lancamentos_producao',
          filter: `usuario_id=eq.${user.id}`
        },
        payload => callback(payload)
      )
      .subscribe();
    return () => client.removeChannel(channel);
  }

  async listarLancamentos({ estado = null, limite = 1000 } = {}) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    let query = client.from('lancamentos_producao').select('*').eq('usuario_id', user.id).order('criado_em', { ascending: true }).limit(Math.min(Math.max(Number(limite) || 1000, 1), 1000));
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query; if (error) throw error; return data ?? [];
  }

  async salvarLancamento(lancamento, estado = 'aberto', semanaId = null) {
    if (!lancamento || typeof lancamento !== 'object' || Array.isArray(lancamento)) throw new TypeError('O lançamento precisa ser um objeto.');
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const origin = idOrigem(lancamento.id ?? lancamento.id_origem);
    if (!origin) throw new TypeError('O lançamento precisa de um ID estável para sincronizar sem duplicar.');
    const pecas = numeroNaoNegativo(lancamento.pecas, 'Quantidade de peças');
    const unitario = numeroNaoNegativo(lancamento.valorUnitario ?? lancamento.valor_unitario ?? 0.21, 'Valor unitário');
    const total = numeroNaoNegativo(lancamento.valorTotal ?? lancamento.valor_total ?? pecas * unitario, 'Valor total');
    const registro = {
      usuario_id: user.id, id_origem: origin, semana_id: semanaId,
      estado: estado === 'fechado' ? 'fechado' : 'aberto',
      data_producao: dataISO(lancamento.dataISO ?? lancamento.data_producao),
      data_texto: String(lancamento.data ?? lancamento.data_texto ?? ''),
      data_completa_texto: lancamento.dataCompleta == null ? null : String(lancamento.dataCompleta),
      semana_referencia: lancamento.semanaReferencia == null ? null : String(lancamento.semanaReferencia),
      texto_original: String(lancamento.textoOriginal ?? lancamento.texto_original ?? ''),
      texto_bruto: String(lancamento.textoBruto ?? lancamento.texto_bruto ?? lancamento.textoOriginal ?? ''),
      pecas, valor_unitario: unitario, valor_total: total,
      detalhes: Array.isArray(lancamento.detalhes) ? lancamento.detalhes : [], source_payload: lancamento
    };
    const { data: existente, error: buscaErro } = await client.from('lancamentos_producao').select('id').eq('usuario_id', user.id).eq('id_origem', origin).maybeSingle();
    if (buscaErro) throw buscaErro; if (existente?.id) registro.id = existente.id;
    const { data, error } = await client.from('lancamentos_producao').upsert(registro, { onConflict: 'id' }).select('*').single();
    if (error) throw error; return data;
  }

  async excluirLancamentoPorOrigem(idOrigem) {
    const client = this.exigirCliente();
    const user = await this.obterUsuarioAtual();

    if (
      idOrigem === undefined ||
      idOrigem === null ||
      String(idOrigem).trim() === ''
    ) {
      throw new TypeError('ID de origem do lançamento inválido.');
    }

    const { error } = await client
      .from('lancamentos_producao')
      .delete()
      .eq('usuario_id', user.id)
      .eq('id_origem', String(idOrigem));

    if (error) throw error;
    return true;
  }

  async listarSemanas({ limite = 500 } = {}) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const { data, error } = await client.from('semanas_producao').select('*').eq('usuario_id', user.id).order('criado_em', { ascending: true }).limit(Math.min(Math.max(Number(limite) || 500, 1), 1000));
    if (error) throw error; return data ?? [];
  }

  async salvarSemana(semana, { salvarLancamentos = true } = {}) {
    if (!semana || typeof semana !== 'object' || Array.isArray(semana)) throw new TypeError('A semana precisa ser um objeto.');
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const origin = idOrigem(semana.id ?? semana.id_origem);
    if (!origin) throw new TypeError('A semana precisa de um ID estável para sincronizar sem duplicar.');
    const registro = {
      usuario_id: user.id, id_origem: origin,
      periodo_label: String(semana.periodo ?? semana.periodo_label ?? ''),
      data_inicio: dataISO(semana.data_inicio ?? semana.dataInicio), data_fim: dataISO(semana.data_fim ?? semana.dataFim),
      pecas_total: numeroNaoNegativo(semana.pecasTotal ?? semana.pecas_total, 'Total de peças'),
      valor_total: numeroNaoNegativo(semana.valorTotal ?? semana.valor_total, 'Valor total'),
      fechada_em: semana.fechada_em ?? new Date().toISOString(), source_payload: semana
    };
    const { data: existente, error: buscaErro } = await client.from('semanas_producao').select('id').eq('usuario_id', user.id).eq('id_origem', origin).maybeSingle();
    if (buscaErro) throw buscaErro; if (existente?.id) registro.id = existente.id;
    const { data, error } = await client.from('semanas_producao').upsert(registro, { onConflict: 'id' }).select('*').single();
    if (error) throw error;
    if (salvarLancamentos) {
      for (const lancamento of (Array.isArray(semana.registros) ? semana.registros : [])) await this.salvarLancamento(lancamento, 'fechado', data.id);
    }
    return data;
  }

  async listarDespesas({ dataInicio = null, dataFim = null, limite = 500 } = {}) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    let query = client.from('anotei_despesas_pessoais').select('*').eq('usuario_id', user.id).order('criado_em', { ascending: true }).limit(Math.min(Math.max(Number(limite) || 500, 1), 1000));
    if (dataInicio) query = query.gte('data_despesa', dataInicio); if (dataFim) query = query.lte('data_despesa', dataFim);
    const { data, error } = await query; if (error) throw error; return data ?? [];
  }

  async salvarDespesa(despesa) {
    if (!despesa || typeof despesa !== 'object' || Array.isArray(despesa)) throw new TypeError('A despesa precisa ser um objeto.');
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const origin = idOrigem(despesa.id ?? despesa.id_origem); if (!origin) throw new TypeError('A despesa precisa de um ID estável.');
    const valor = numeroNaoNegativo(despesa.valor ?? despesa.value, 'Valor da despesa');
    const dataBruta = despesa.data ?? despesa.dueDate ?? despesa.data_texto ?? null;
    const registro = {
      usuario_id: user.id, id_origem: origin,
      descricao: String(despesa.descricao ?? despesa.description ?? despesa.texto ?? ''),
      categoria: String(despesa.categoria ?? despesa.category ?? ''),
      semana_referencia: despesa.semanaReferencia == null ? null : String(despesa.semanaReferencia),
      valor, data_despesa: dataISO(dataBruta), data_texto: dataBruta == null ? null : String(dataBruta),
      tipo: despesa.tipo ?? despesa.frequency ?? null,
      observacao: String(despesa.observacao ?? despesa.observacoes ?? ''), source_payload: despesa
    };
    const { data: existente, error: buscaErro } = await client.from('anotei_despesas_pessoais').select('id').eq('usuario_id', user.id).eq('id_origem', origin).maybeSingle();
    if (buscaErro) throw buscaErro; if (existente?.id) registro.id = existente.id;
    const { data, error } = await client.from('anotei_despesas_pessoais').upsert(registro, { onConflict: 'id' }).select('*').single();
    if (error) throw error; return data;
  }

  async excluirDespesaPorOrigem(id) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const { error } = await client.from('anotei_despesas_pessoais').delete().eq('usuario_id', user.id).eq('id_origem', String(id));
    if (error) throw error;
  }

  async excluirDespesa(id) {
    const client = this.exigirCliente(); const user = await this.obterUsuarioAtual();
    const { error } = await client.from('anotei_despesas_pessoais').delete().eq('usuario_id', user.id).eq('id', String(id));
    if (error) throw error;
  }
}

export const supabaseRelacionalService = new SupabaseRelacionalService();
