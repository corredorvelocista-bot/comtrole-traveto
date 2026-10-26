/**
 * Sincronização automática com Google Planilhas.
 * Só atua se o usuário já conectou o Google na página Migração de dados.
 * Supabase continua sendo a fonte oficial; a planilha é uma cópia de consulta.
 */
import { supabase, supabaseConfigurado } from './SupabaseService.js';
import { supabaseRelacionalService as remoto } from './SupabaseRelacionalService.js';
import { GoogleService } from './GoogleService.js';

let iniciado = false;
let emSincronizacao = false;
let pendente = false;
let timer = null;
let channel = null;
let google = null;
let usuarioId = null;
let ultimaFalha = '';

function informar(mensagem, tipo = 'info') {
  console.info(`[Anotei Google Sync][${tipo}] ${mensagem}`);
  window.dispatchEvent(new CustomEvent('anotei:google-sync-status', { detail: { mensagem, tipo } }));
}

function carregarGoogleIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-anotei-google-identity]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.anoteiGoogleIdentity = 'true';
      document.head.appendChild(script);
    }
    const timeout = window.setTimeout(() => reject(new Error('O login do Google não carregou a tempo.')), 15000);
    script.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Não foi possível carregar o login do Google.')); }, { once: true });
    if (globalThis.google?.accounts?.oauth2) { clearTimeout(timeout); resolve(); }
  });
}

async function sincronizar(motivo = 'alteração detectada') {
  if (!google || !google.accessToken || !usuarioId) return;
  if (emSincronizacao) { pendente = true; return; }
  emSincronizacao = true;
  try {
    google.configurarUsuario(usuarioId);
    const [lancamentos, despesas] = await Promise.all([
      remoto.listarLancamentos({ limite: 1000 }),
      remoto.listarDespesas({ limite: 1000 })
    ]);
    const resultado = await google.sincronizarTudo(lancamentos, despesas);
    ultimaFalha = '';
    informar(`Atualização automática concluída (${motivo}): ${resultado.producao} lançamentos e ${resultado.despesas} despesas.`, 'success');
  } catch (error) {
    const mensagem = error?.message || String(error);
    if (mensagem !== ultimaFalha) informar(`A sincronização automática não foi concluída: ${mensagem}. Abra Migração de dados, reconecte o Google se necessário e use o botão para conferir.`, 'warning');
    ultimaFalha = mensagem;
  } finally {
    emSincronizacao = false;
    if (pendente) { pendente = false; queueMicrotask(() => sincronizar('alterações acumuladas')); }
  }
}

export async function iniciarGoogleSyncAutomatica() {
  if (iniciado || !supabaseConfigurado || !supabase) return;
  iniciado = true;
  try {
    const user = await remoto.obterUsuarioAtual();
    usuarioId = user.id;
    // Não força autenticação Google nem interrompe o app se a integração ainda não foi conectada.
    if (!localStorage.getItem('google_access_token')) {
      informar('Sincronização automática aguardando a conexão Google inicial em Migração de dados.');
      return;
    }
    await carregarGoogleIdentity();
    google = new GoogleService({
      ambienteLocal: Boolean(import.meta.env?.DEV),
      onLoginStatusChange: conectado => {
        if (conectado) sincronizar('início do Anotei');
      }
    });
    google.configurarUsuario(usuarioId);
    google.initGoogleAuth();

    channel = supabase.channel(`anotei-google-auto-${usuarioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_producao', filter: `usuario_id=eq.${usuarioId}` }, () => sincronizar('alteração na produção'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anotei_despesas_pessoais', filter: `usuario_id=eq.${usuarioId}` }, () => sincronizar('alteração nas despesas'))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') informar('Monitoramento automático da produção e das despesas ativo.', 'success');
      });

    // Recupera alterações perdidas se o navegador ficou suspenso ou o Realtime reconectou.
    timer = window.setInterval(() => sincronizar('verificação periódica'), 5 * 60 * 1000);
    window.addEventListener('online', () => sincronizar('retorno da conexão')); 
    window.addEventListener('focus', () => sincronizar('retorno ao Anotei'));
    window.addEventListener('anotei:despesas-remotas-atualizadas', () => sincronizar('despesas salvas'));
  } catch (error) {
    informar(`Sincronização automática indisponível: ${error?.message || String(error)}`, 'warning');
  }
}
