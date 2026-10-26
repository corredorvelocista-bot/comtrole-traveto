import { supabaseConfigurado } from './SupabaseService.js';
import { supabaseRelacionalService as remoto } from './SupabaseRelacionalService.js';
import { StorageService } from './StorageService.js';
import { DespesasPessoaisService } from './DespesasPessoaisService.js';
import { ConfiguracaoService } from './ConfiguracaoService.js';
import { GoogleService } from './GoogleService.js';

const $ = id => document.getElementById(id);
const storage = new StorageService();
const despesasService = new DespesasPessoaisService();
const configuracaoService = new ConfiguracaoService();
let snapshot = null;
let resumoRemoto = null;
let emExecucao = false;
let usuarioGoogleConfigurado = false;
const googleService = new GoogleService({
  ambienteLocal: Boolean(import.meta.env?.DEV),
  onLoginStatusChange: conectado => {
    const connect = $('google-connect');
    const sync = $('google-sync');
    if (connect) connect.textContent = conectado ? 'Conta Google conectada' : 'Conectar conta Google';
    if (sync) sync.disabled = !conectado || !usuarioGoogleConfigurado;
    if (!conectado) {
      if ($('google-status')) $('google-status').textContent = 'Conecte a conta Google que deverá guardar suas planilhas.';
      if ($('google-open')) $('google-open').disabled = true;
    } else if ($('google-status')) {
      $('google-status').textContent = 'Conta Google conectada. Sincronize para criar ou atualizar suas duas abas.';
    }
  }
});

function parseArray(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { throw new Error(`O conteúdo local de "${key}" não é um JSON válido. Nenhum dado foi alterado.`); }
}
function localId(item, prefix) {
  const id = item?.id ?? item?.id_origem ?? item?.uuid;
  return id == null || String(id).trim() === '' ? `${prefix}-sem-id-${JSON.stringify(item)}` : String(id);
}
function comIdEstavel(item, prefix) {
  const id = item?.id ?? item?.id_origem ?? item?.uuid;
  return id == null || String(id).trim() === '' ? { ...item, id: localId(item, prefix) } : item;
}
async function lerSnapshotLocal() {
  const lancamentos = parseArray('temp_lancamentos');
  const semanas = await storage.obterTodasSemanas();
  const despesas = despesasService.obterTodas();
  const configuracoes = configuracaoService.obterTodas();
  const registrosFechados = semanas.flatMap(s => Array.isArray(s?.registros) ? s.registros : []);
  const todosLancamentos = [...lancamentos, ...registrosFechados];
  const unicos = new Map();
  for (const item of todosLancamentos) unicos.set(localId(item, 'lancamento'), item);
  return { lancamentos: [...unicos.values()], semanas, despesas, configuracoes };
}
function renderLocal() {
  $('local-launches').textContent = snapshot.lancamentos.length.toLocaleString('pt-BR');
  $('local-weeks').textContent = snapshot.semanas.length.toLocaleString('pt-BR');
  $('local-expenses').textContent = snapshot.despesas.length.toLocaleString('pt-BR');
  $('local-config').textContent = Object.keys(snapshot.configuracoes).length.toLocaleString('pt-BR');
}
function status(message, kind = 'muted') {
  const elemento = $('status');
  if (!elemento) { console.error('[Anotei migração]', message); return; }
  elemento.className = kind;
  elemento.textContent = message;
}

// Torna falhas de inicialização visíveis em vez de deixar a página aparentemente inerte.
window.addEventListener('error', event => {
  status(`Erro de JavaScript: ${event.message || 'falha ao carregar o código da página'}. Abra o Console do navegador para ver os detalhes.`, 'error');
});
window.addEventListener('unhandledrejection', event => {
  const mensagem = event.reason?.message || String(event.reason || 'erro inesperado');
  status(`Falha inesperada: ${mensagem}`, 'error');
});
async function conferir() {
  $('import').disabled = true;
  $('push-config').disabled = true;
  $('pull-config').disabled = true;
  status('Conferência iniciada: lendo dados locais e verificando a sessão…');
  try {
    snapshot = await lerSnapshotLocal(); renderLocal();
    if (!supabaseConfigurado) throw new Error('O Supabase não está configurado neste build. Confira as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
    const user = await remoto.obterUsuarioAtual();
    const [lancamentos, semanas, despesas, configuracoes] = await Promise.all([
      remoto.listarLancamentos({ limite: 1000 }), remoto.listarSemanas({ limite: 1000 }), remoto.listarDespesas({ limite: 1000 }), remoto.obterConfiguracoes()
    ]);
    resumoRemoto = { user, lancamentos, semanas, despesas, configuracoes };
    const ids = (list, prefix) => new Set(list.map(x => String(x.id_origem ?? x.source_payload?.id ?? x.id ?? `${prefix}-sem-id`)));
    const faltamLancamentos = snapshot.lancamentos.filter(x => !ids(lancamentos, 'l').has(localId(x, 'lancamento')));
    const faltamSemanas = snapshot.semanas.filter(x => !ids(semanas, 's').has(localId(x, 'semana')));
    const faltamDespesas = snapshot.despesas.filter(x => !ids(despesas, 'd').has(localId(x, 'despesa')));
    const config = configuracoes ? 'já existe na nuvem (será preservada)' : 'não existe na nuvem (poderá ser criada)';
    $('remote-summary').textContent = `Conta autenticada: ${user.email || user.id}. Na nuvem: ${lancamentos.length} lançamentos, ${semanas.length} semanas e ${despesas.length} despesas. Faltando: ${faltamLancamentos.length} lançamentos, ${faltamSemanas.length} semanas e ${faltamDespesas.length} despesas. Configuração: ${config}.`;
    $('import').disabled = false;
    $('push-config').disabled = false;
    $('pull-config').disabled = !configuracoes;
    status('Conferência concluída. Nenhum dado foi gravado ou apagado.', 'success');
  } catch (e) {
    resumoRemoto = null;
    $('remote-summary').textContent = 'Conferência não concluída. Leia o erro abaixo; os botões de sincronização ficam bloqueados até a autenticação funcionar.';
    status(`A conferência falhou: ${e?.message || String(e)}. Nenhum dado foi alterado.`, 'error');
  }
}
async function importar() {
  if (emExecucao || !snapshot || !resumoRemoto) return;
  const confirmado = window.confirm('Confirma a importação dos dados locais ausentes para a conta autenticada? Os registros locais serão mantidos. Configurações remotas existentes não serão substituídas.');
  if (!confirmado) return;
  emExecucao = true; $('import').disabled = true; $('progress').hidden = false; $('progress').value = 0; $('progress').max = 1;
  const erros = []; let feitos = 0; let ignorados = 0;
  try {
    // Recarrega snapshot e remoto imediatamente antes da escrita para reduzir a janela de conflito.
    snapshot = await lerSnapshotLocal();
    const [lancamentosRemotos, semanasRemotas, despesasRemotas, configRemota] = await Promise.all([
      remoto.listarLancamentos({ limite: 1000 }), remoto.listarSemanas({ limite: 1000 }), remoto.listarDespesas({ limite: 1000 }), remoto.obterConfiguracoes()
    ]);
    const idsLancamentos = new Set(lancamentosRemotos.map(x => String(x.id_origem ?? x.source_payload?.id ?? x.id)));
    const idsSemanas = new Set(semanasRemotas.map(x => String(x.id_origem ?? x.source_payload?.id ?? x.id)));
    const idsDespesas = new Set(despesasRemotas.map(x => String(x.id_origem ?? x.source_payload?.id ?? x.id)));
    const total = snapshot.lancamentos.length + snapshot.semanas.length + snapshot.despesas.length + (configRemota ? 0 : 1);
    $('progress').max = Math.max(total, 1);
    // Importa semanas sem regravar os lançamentos aninhados; os lançamentos são tratados por ID separadamente.
    for (const semana of snapshot.semanas) {
      const id = localId(semana, 'semana');
      if (idsSemanas.has(id)) { ignorados++; continue; }
      try { await remoto.salvarSemana(comIdEstavel(semana, 'semana'), { salvarLancamentos: false }); idsSemanas.add(id); feitos++; }
      catch (e) { erros.push(`Semana ${id}: ${e.message || e}`); }
      $('progress').value++;
    }
    const idsLancamentosLocais = new Set();
    for (const semana of snapshot.semanas) for (const item of (Array.isArray(semana.registros) ? semana.registros : [])) idsLancamentosLocais.add(localId(item, 'lancamento'));
    for (const item of snapshot.lancamentos) {
      const id = localId(item, 'lancamento');
      if (idsLancamentos.has(id)) { ignorados++; $('progress').value++; continue; }
      const fechado = idsLancamentosLocais.has(id);
      try { await remoto.salvarLancamento(comIdEstavel(item, 'lancamento'), fechado ? 'fechado' : 'aberto'); idsLancamentos.add(id); feitos++; }
      catch (e) { erros.push(`Lançamento ${id}: ${e.message || e}`); }
      $('progress').value++;
    }
    for (const item of snapshot.despesas) {
      const id = localId(item, 'despesa');
      if (idsDespesas.has(id)) { ignorados++; $('progress').value++; continue; }
      try { await remoto.salvarDespesa(comIdEstavel(item, 'despesa')); idsDespesas.add(id); feitos++; }
      catch (e) { erros.push(`Despesa ${id}: ${e.message || e}`); }
      $('progress').value++;
    }
    if (!configRemota) {
      try { await remoto.salvarConfiguracoes(snapshot.configuracoes, null); feitos++; }
      catch (e) { erros.push(`Configurações: ${e.message || e}`); }
      $('progress').value++;
    } else { ignorados++; }
    const mensagem = `Importação encerrada.\nImportados: ${feitos}\nIgnorados por já existirem: ${ignorados}\nFalhas: ${erros.length}${erros.length ? `\n\nDetalhes (até 20):\n${erros.slice(0,20).join('\n')}` : ''}\n\nOs dados locais não foram apagados.`;
    status(mensagem, erros.length ? 'error' : 'success');
    await conferir();
  } catch (e) { status(`A importação foi interrompida: ${e.message || e}\nOs dados locais foram mantidos.`, 'error'); }
  finally { emExecucao = false; $('import').disabled = false; }
}
async function enviarConfiguracoesLocais() {
  if (emExecucao) return;
  const confirmado = window.confirm('Enviar as configurações deste navegador para a nuvem? Isso atualizará as configurações remotas da conta, mas não apagará os dados locais.');
  if (!confirmado) return;
  emExecucao = true;
  $('push-config').disabled = true;
  $('pull-config').disabled = true;
  try {
    const locais = configuracaoService.obterTodas();
    // Releitura imediatamente antes de gravar: o RPC compara a versão atual de forma atômica.
    const remotoAtual = await remoto.obterConfiguracoes();
    const salvo = await remoto.salvarConfiguracoes(locais, remotoAtual?.versao ?? null);
    status(`Configurações locais enviadas. Versão remota: ${salvo?.versao ?? 'atualizada'}. Os dados locais foram mantidos.`, 'success');
    await conferir();
  } catch (e) {
    status(`Não foi possível enviar as configurações: ${e.message || e}
Nenhum dado local foi apagado. Atualize a conferência antes de tentar novamente.`, 'error');
  } finally {
    emExecucao = false;
    $('push-config').disabled = false;
    $('pull-config').disabled = !resumoRemoto?.configuracoes;
  }
}

async function importarConfiguracoesRemotas() {
  if (emExecucao) return;
  try {
    const remotoAtual = await remoto.obterConfiguracoes();
    if (!remotoAtual || !remotoAtual.valores || typeof remotoAtual.valores !== 'object' || Array.isArray(remotoAtual.valores)) {
      throw new Error('Não há configurações válidas na nuvem para importar.');
    }
    const confirmado = window.confirm('Importar as configurações da nuvem para este navegador? Os valores locais correspondentes serão substituídos. Recomendamos anotar ou exportar suas configurações atuais antes de continuar.');
    if (!confirmado) return;
    emExecucao = true;
    $('push-config').disabled = true;
    $('pull-config').disabled = true;
    // definirTodas aceita somente chaves reconhecidas e preserva as chaves locais fora do objeto remoto.
    configuracaoService.definirTodas(remotoAtual.valores);
    status(`Configurações da nuvem importadas para este navegador (versão ${remotoAtual.versao ?? 'não informada'}). Os demais dados locais não foram alterados.`, 'success');
    window.alert('Configurações importadas. Recarregue a página principal do Anotei para que todos os campos sejam atualizados.');
    await conferir();
  } catch (e) {
    status(`Não foi possível importar as configurações: ${e.message || e}`, 'error');
  } finally {
    emExecucao = false;
    $('push-config').disabled = false;
    $('pull-config').disabled = !resumoRemoto?.configuracoes;
  }
}

async function prepararGooglePlanilhas() {
  try {
    if (!supabaseConfigurado) throw new Error('Configure o Supabase e entre na conta do Anotei antes de conectar as planilhas.');
    const user = await remoto.obterUsuarioAtual();
    googleService.configurarUsuario(user.id);
    usuarioGoogleConfigurado = true;
    if (typeof googleService.initGoogleAuth === 'function') {
      // O script oficial é carregado pela própria página. Se a rede ainda estiver carregando, aguarda o evento load.
      if (!globalThis.google?.accounts?.oauth2 && document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
      }
      googleService.initGoogleAuth();
    }
    if ($('google-sync')) $('google-sync').disabled = !googleService.accessToken;
    if ($('google-open')) $('google-open').disabled = !googleService.spreadsheetIdSalvo;
    if ($('google-status') && !googleService.accessToken) $('google-status').textContent = `Conta Anotei identificada (${user.email || user.id}). Conecte a conta Google para continuar.`;
  } catch (error) {
    if ($('google-status')) $('google-status').textContent = error.message || String(error);
    if ($('google-connect')) $('google-connect').disabled = true;
  }
}

async function conectarGoogle() {
  try {
    if (!usuarioGoogleConfigurado) await prepararGooglePlanilhas().then(() => {
  if (!supabaseConfigurado) return;
  // Sincroniza automaticamente ao abrir a página se o Google já foi conectado.
  if (googleService.accessToken && usuarioGoogleConfigurado) {
    sincronizarGooglePlanilhas();
    remoto.exigirCliente().channel(`anotei-google-migracao-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_producao' }, payload => {
        if (payload.new?.usuario_id === googleService.usuarioAnoteiId || payload.old?.usuario_id === googleService.usuarioAnoteiId) sincronizarGooglePlanilhas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anotei_despesas_pessoais' }, payload => {
        if (payload.new?.usuario_id === googleService.usuarioAnoteiId || payload.old?.usuario_id === googleService.usuarioAnoteiId) sincronizarGooglePlanilhas();
      })
      .subscribe();
    window.setInterval(() => sincronizarGooglePlanilhas(), 5 * 60 * 1000);
  }
});
    googleService.fazerLoginGoogle();
  } catch (error) {
    if ($('google-status')) $('google-status').textContent = error.message || String(error);
  }
}

async function sincronizarGooglePlanilhas() {
  const syncButton = $('google-sync');
  if (syncButton) syncButton.disabled = true;
  if ($('google-status')) $('google-status').textContent = 'Lendo os dados da sua conta Anotei…';
  try {
    const user = await remoto.obterUsuarioAtual();
    googleService.configurarUsuario(user.id);
    const [lancamentos, despesas] = await Promise.all([
      remoto.listarLancamentos({ limite: 1000 }),
      remoto.listarDespesas({ limite: 1000 })
    ]);
    if ($('google-status')) $('google-status').textContent = 'Atualizando as abas Produção e Despesas…';
    const resultado = await googleService.sincronizarTudo(lancamentos, despesas);
    if ($('google-status')) $('google-status').textContent = `Sincronização concluída: ${resultado.producao} lançamentos de produção e ${resultado.despesas} despesas enviados para sua planilha.`;
    if ($('google-open')) $('google-open').disabled = false;
    if ($('google-open')) $('google-open').onclick = () => {
      const url = googleService.obterUrlPlanilha();
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };
    status('Google Planilhas atualizado com os dados remotos da conta autenticada. Nenhum registro do Anotei foi alterado.', 'success');
  } catch (error) {
    if ($('google-status')) $('google-status').textContent = `Não foi possível sincronizar: ${error.message || String(error)}`;
  } finally {
    if (syncButton) syncButton.disabled = !googleService.accessToken;
  }
}

$('google-connect')?.addEventListener('click', conectarGoogle);
$('google-sync')?.addEventListener('click', sincronizarGooglePlanilhas);
$('google-open')?.addEventListener('click', () => {
  const url = googleService.obterUrlPlanilha();
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
});
prepararGooglePlanilhas();

$('preview').addEventListener('click', () => {
  status('Botão acionado. Atualizando conferência…');
  conferir();
});
$('import').addEventListener('click', importar);
$('push-config').addEventListener('click', enviarConfiguracoesLocais);
$('pull-config').addEventListener('click', importarConfiguracoesRemotas);

status('JavaScript carregado. Iniciando conferência automática…');
conferir().catch(error => status(`Falha ao iniciar a conferência: ${error?.message || error}`, 'error'));
