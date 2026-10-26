import { supabase, supabaseConfigurado } from './SupabaseService.js';
import { supabaseRelacionalService } from './SupabaseRelacionalService.js';

const TABELAS_PERMITIDAS = new Set([
  'lancamentos_producao', 'semanas_producao', 'despesas_pessoais',
  'configuracoes_usuario', 'perfis'
]);

/** Compatibilidade para chamadas antigas; usa o cliente compartilhado e o esquema relacional atual. */
export class SyncManager {
  constructor() {
    this.supabase = supabaseConfigurado ? supabase : null;
    this.channel = null;
  }

  exigirTabela(tableName) {
    if (!TABELAS_PERMITIDAS.has(tableName)) throw new Error(`Tabela não autorizada para sincronização: ${tableName}`);
    if (!this.supabase) throw new Error('Supabase não configurado.');
  }

  async salvarOuAtualizar(tableName, data) {
    this.exigirTabela(tableName);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('Dados inválidos para sincronização.');
    if (tableName === 'lancamentos_producao') return supabaseRelacionalService.salvarLancamento(data, data.estado || 'aberto');
    if (tableName === 'semanas_producao') return supabaseRelacionalService.salvarSemana(data);
    if (tableName === 'despesas_pessoais') return supabaseRelacionalService.salvarDespesa(data);
    if (tableName === 'configuracoes_usuario') return supabaseRelacionalService.salvarConfiguracoes(data.valores || data);
    if (tableName === 'perfis') return supabaseRelacionalService.salvarPerfil(data);
    throw new Error(`Não há operação de gravação configurada para ${tableName}.`);
  }

  async deletarRegistro(tableName, id) {
    this.exigirTabela(tableName);
    if (id === undefined || id === null || String(id).trim() === '') throw new TypeError('ID obrigatório.');
    if (tableName === 'despesas_pessoais') return supabaseRelacionalService.excluirDespesaPorOrigem(id);
    throw new Error(`Exclusão remota não habilitada para ${tableName}; use um fluxo explícito para evitar apagar histórico por engano.`);
  }

  async iniciarSincronizacaoRealtime(tableName, onUpdateCallback) {
    this.exigirTabela(tableName);
    if (this.channel) await this.supabase.removeChannel(this.channel);
    const user = await supabaseRelacionalService.obterUsuarioAtual();
    const tabelaRemota = tableName === 'despesas_pessoais' ? 'anotei_despesas_pessoais' : tableName;
    this.channel = this.supabase.channel(`anotei-sync-${tableName}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabelaRemota, filter: `usuario_id=eq.${user.id}` }, payload => {
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .subscribe(status => console.info(`[Anotei Sync] Realtime ${tableName}: ${status}`));
    return this.channel;
  }

  async pararSincronizacao() {
    if (this.channel && this.supabase) await this.supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
