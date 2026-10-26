import { supabaseRelacionalService } from './SupabaseRelacionalService.js';

const CHAVE_FILA = 'anotei_fila_sincronizacao_v1';

function lerFila() {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE_FILA) || '[]');
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}
function gravarFila(fila) { localStorage.setItem(CHAVE_FILA, JSON.stringify(fila)); }

/** Sincronização local-first: uma falha de rede nunca desfaz uma gravação local. */
export class SincronizacaoRelacionalController {
  constructor(servico = supabaseRelacionalService) { this.servico = servico; this.executando = false; }

  enfileirar(tipo, payload) {
    const fila = lerFila();
    const chave = payload?.id == null ? null : String(payload.id);
    const existente = fila.findIndex(item => item.tipo === tipo && ((tipo === 'configuracoes') || (chave !== null && String(item.payload?.id) === chave))); 
    const item = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, tipo, payload, criadoEm: new Date().toISOString(), tentativas: 0 };
    if (existente >= 0) fila[existente] = item; else fila.push(item);
    gravarFila(fila);
    return item;
  }

  async executarPendencias() {
    if (this.executando || !navigator.onLine) return { processadas: 0, pendentes: lerFila().length };
    this.executando = true;
    let processadas = 0;
    try {
      await this.servico.obterUsuarioAtual();
      let fila = lerFila();
      const limiteDaRodada = fila.length;
      for (let i = 0; i < limiteDaRodada; i++) {
        const item = fila.shift();
        if (item.bloqueado) { fila.push(item); gravarFila(fila); continue; }
        try {
          if (item.tipo === 'lancamento') await this.servico.salvarLancamento(item.payload, item.estado || 'aberto');
          else if (item.tipo === 'semana') await this.servico.salvarSemana(item.payload);
          else if (item.tipo === 'despesa') await this.servico.salvarDespesa(item.payload);
          else if (item.tipo === 'excluir-despesa') await this.servico.excluirDespesaPorOrigem(item.payload.id);
          else if (item.tipo === 'configuracoes') await this.servico.salvarConfiguracoes(item.payload);
          else throw new Error(`Operação de sincronização desconhecida: ${item.tipo}`);
          processadas++;
        } catch (erro) {
          item.tentativas = (item.tentativas || 0) + 1;
          item.ultimoErro = String(erro?.message || erro).slice(0, 300);
          if (erro?.code === 'ANOTEI_CONFLICT' || erro?.code === 'P0001') {
            item.bloqueado = true;
            item.motivoBloqueio = 'Conflito de versão: revise os dados remotos antes de reenviar.';
          }
          fila.push(item); // Um conflito fica bloqueado e não é sobrescrito silenciosamente.
        }
        gravarFila(fila);
      }
    } catch (erro) {
      console.info('[Anotei Sync] Sincronização adiada:', erro?.message || erro);
    } finally { this.executando = false; }
    return { processadas, pendentes: lerFila().length };
  }

  obterEstado() { return { pendentes: lerFila().length, bloqueadas: lerFila().filter(x => x.bloqueado).length, fila: lerFila().map(({ tipo, criadoEm, tentativas, ultimoErro, bloqueado, motivoBloqueio }) => ({ tipo, criadoEm, tentativas, ultimoErro, bloqueado: Boolean(bloqueado), motivoBloqueio })) }; }
}

export const sincronizacaoRelacionalController = new SincronizacaoRelacionalController();
window.addEventListener('online', () => { sincronizacaoRelacionalController.executarPendencias(); });
