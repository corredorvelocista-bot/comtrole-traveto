import { GlobalAparenciaController } from './GlobalAparenciaController.js';

const $ = (id) => document.getElementById(id);
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');
const hoje = new Date();
const chaveMes = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`;
let lancamentos = [];
let despesas = [];
let registrosSemData = 0;

new GlobalAparenciaController().inicializar();

function dataISOValida(valor) {
    if (!valor || typeof valor !== 'string') return null;
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getFullYear() === Number(m[1]) && d.getMonth() + 1 === Number(m[2]) && d.getDate() === Number(m[3]) ? valor : null;
}

function dataDoLancamento(registro, semana = null) {
    const iso = dataISOValida(registro?.dataISO) || dataISOValida(registro?.data);
    if (iso) return iso;

    const br = String(registro?.data || registro?.dataCompleta || '').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (!br) return null;
    let ano = br[3] ? Number(br[3]) : null;
    const referencia = dataISOValida(registro?.semanaReferencia) || dataISOValida(semana?.semanaReferencia);
    if (!ano && referencia) ano = Number(referencia.slice(0, 4));
    if (!ano) {
        // O histórico antigo não guardava o ano da data diária. Não atribuímos
        // automaticamente um ano que possa deslocar a produção para outro mês.
        return null;
    }
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]));
    if (d.getFullYear() !== ano || d.getMonth() + 1 !== Number(br[2]) || d.getDate() !== Number(br[1])) return null;
    return `${ano}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function normalizarLancamento(registro, semana = null) {
    const data = dataDoLancamento(registro, semana);
    if (!data) { registrosSemData++; return null; }
    const pecas = Number(registro?.pecas) || 0;
    const valor = Number(registro?.valorTotal ?? (pecas * (Number(registro?.valorUnitario) || 0)));
    return { data, pecas, valor: Number.isFinite(valor) ? valor : 0 };
}

function abrirDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return resolve(null);
        const request = indexedDB.open('TraveteDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function obterSemanasSalvas() {
    let db;
    try {
        db = await abrirDB();
        if (!db) {
            const local = JSON.parse(localStorage.getItem('historico_semanas') || '[]');
            return Array.isArray(local) ? local : [];
        }
        if (!db.objectStoreNames.contains('semanas')) return [];
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(['semanas'], 'readonly');
            const request = tx.objectStore('semanas').getAll();
            request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Não foi possível ler o histórico de produção:', error);
        // Fallback apenas para o armazenamento local legado; não grava nada.
        try {
            const local = JSON.parse(localStorage.getItem('historico_semanas') || '[]');
            return Array.isArray(local) ? local : [];
        } catch { return []; }
    } finally {
        if (db && typeof db.close === 'function') db.close();
    }
}

function carregarLancamentos() {
    let atuais = [];
    try {
        const valor = JSON.parse(localStorage.getItem('temp_lancamentos') || '[]');
        if (Array.isArray(valor)) atuais = valor;
    } catch (error) {
        console.error('Não foi possível ler os lançamentos atuais:', error);
    }
    return atuais.map(reg => normalizarLancamento(reg)).filter(Boolean);
}

function carregarDespesas() {
    try {
        const valor = JSON.parse(localStorage.getItem('despesas_pessoais') || '[]');
        return Array.isArray(valor) ? valor.map(item => ({
            data: dataISOValida(String(item?.data || '')),
            valor: Number(item?.valor) || 0
        })).filter(item => item.data) : [];
    } catch (error) {
        console.error('Não foi possível ler as despesas:', error);
        return [];
    }
}

function semanaDoMes(data) {
    const d = new Date(`${data}T12:00:00`);
    const primeiro = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    return Math.floor((d.getDate() + primeiro.getDay() - 1) / 7) + 1;
}

function agregar(chave) {
    const prod = lancamentos.filter(item => item.data.startsWith(chave));
    const desp = despesas.filter(item => item.data.startsWith(chave));
    const pecas = prod.reduce((s, item) => s + item.pecas, 0);
    const bruto = prod.reduce((s, item) => s + item.valor, 0);
    const totalDespesas = desp.reduce((s, item) => s + item.valor, 0);
    const semanas = [0,0,0,0,0,0];
    prod.forEach(item => { semanas[semanaDoMes(item.data)-1] += item.pecas; });
    while (semanas.length && semanas[semanas.length - 1] === 0) semanas.pop();
    return { pecas, bruto, despesas: totalDespesas, resultado: bruto - totalDespesas, semanas, temDados: prod.length > 0 || desp.length > 0 };
}

function anterior(chave) {
    const [ano, mes] = chave.split('-').map(Number);
    const data = new Date(ano, mes - 2, 1);
    return chaveMes(data.getFullYear(), data.getMonth() + 1);
}
function variacao(atual, anteriorValor) {
    if (anteriorValor === 0) return atual === 0 ? 0 : null;
    return ((atual - anteriorValor) / Math.abs(anteriorValor)) * 100;
}
function textoVariacao(atual, anteriorValor) {
    const v = variacao(atual, anteriorValor);
    if (v === null) return atual === 0 ? '0%' : 'Novo';
    return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
}
function classeVariacao(atual, anteriorValor, menorMelhor = false) {
    const v = variacao(atual, anteriorValor);
    return v === null ? '' : ((menorMelhor ? v <= 0 : v >= 0) ? 'good-text' : 'bad-text');
}
function indicador(id, atual, anteriorValor, menorMelhor = false) {
    const el = $(id);
    const v = variacao(atual, anteriorValor);
    el.textContent = v === null ? 'Novo' : `${v > 0 ? '↑' : v < 0 ? '↓' : '→'} ${Math.abs(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
    el.className = `change ${v === null ? '' : ((menorMelhor ? v <= 0 : v >= 0) ? 'up' : 'down')}`;
}
function preencherSelects() {
    const m = $('month'), y = $('year');
    meses.forEach((nome, i) => {
        const option = document.createElement('option');
        option.value = String(i + 1).padStart(2, '0');
        option.textContent = nome;
        m.append(option);
    });
    const anos = new Set([hoje.getFullYear()-3, hoje.getFullYear()-2, hoje.getFullYear()-1, hoje.getFullYear(), hoje.getFullYear()+1, hoje.getFullYear()+2]);
    [...lancamentos, ...despesas].forEach(item => anos.add(Number(item.data.slice(0,4))));
    [...anos].sort((a,b)=>a-b).forEach(ano => {
        const option = document.createElement('option');
        option.value = String(ano); option.textContent = String(ano); y.append(option);
    });
    m.value = String(hoje.getMonth()+1).padStart(2,'0');
    y.value = String(hoje.getFullYear());
}
function graficoProducao(valores) {
    const box = $('productionChart');
    box.replaceChildren();
    if (!valores.length) {
        box.className = 'bars empty';
        box.textContent = 'Sem registros de produção neste mês.';
        $('average').textContent = 'Sem dados';
        $('best').textContent = 'Maior produção: —';
        return;
    }
    box.className = 'bars';
    const max = Math.max(...valores, 1), melhor = valores.indexOf(max);
    valores.forEach((valor, i) => {
        const col = document.createElement('div'); col.className = 'bar-col';
        const labelValor = document.createElement('span'); labelValor.className = 'bar-value'; labelValor.textContent = numero.format(valor);
        const track = document.createElement('div'); track.className = 'bar-track';
        const fill = document.createElement('div'); fill.className = 'bar-fill' + (i === melhor ? ' best' : '');
        fill.style.height = `${Math.max(3, valor / max * 100)}%`; track.append(fill);
        const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = `Semana ${i+1}`;
        col.append(labelValor, track, label); box.append(col);
    });
    const total = valores.reduce((s,v)=>s+v,0);
    $('average').textContent = `Média: ${numero.format(Math.round(total/valores.length))} peças/semana`;
    $('best').textContent = `Maior produção: Semana ${melhor+1}`;
}
function graficoFinanceiro(bruto, totalDespesas) {
    const box = $('financeChart'); box.replaceChildren();
    const max = Math.max(Math.abs(bruto), Math.abs(totalDespesas), 1);
    [{label:'Valor bruto produzido',valor:bruto,tipo:'gross'},{label:'Despesas registradas',valor:totalDespesas,tipo:'expenses'}].forEach(item => {
        const row = document.createElement('div'); row.className = 'finance-row';
        const head = document.createElement('div'); head.className = 'finance-head';
        const label = document.createElement('span'); label.textContent = item.label;
        const value = document.createElement('strong'); value.textContent = moeda.format(item.valor); head.append(label,value);
        const track = document.createElement('div'); track.className = 'track';
        const fill = document.createElement('div'); fill.className = `fill ${item.tipo}`; fill.style.width = `${Math.abs(item.valor)/max*100}%`;
        track.append(fill); row.append(head,track); box.append(row);
    });
}
function renderizar() {
    const chave = chaveMes(Number($('year').value), Number($('month').value));
    const chaveAnterior = anterior(chave), atual = agregar(chave), prev = agregar(chaveAnterior);
    const mesAtual = meses[Number($('month').value)-1], mesAnterior = meses[Number(chaveAnterior.slice(5))-1];
    $('periodTitle').textContent = `Resumo mensal · ${mesAtual} de ${$('year').value}`;
    $('pieces').innerHTML = `${numero.format(atual.pecas)} <small>peças</small>`;
    $('gross').textContent = moeda.format(atual.bruto);
    $('expenses').textContent = moeda.format(atual.despesas);
    $('result').textContent = moeda.format(atual.resultado);
    $('grossLegend').textContent = moeda.format(atual.bruto);
    $('expensesLegend').textContent = moeda.format(atual.despesas);
    indicador('piecesChange', atual.pecas, prev.pecas);
    indicador('grossChange', atual.bruto, prev.bruto);
    indicador('expensesChange', atual.despesas, prev.despesas, true);
    indicador('resultChange', atual.resultado, prev.resultado);
    $('compareTitle').textContent = `${mesAtual} × ${mesAnterior}`;
    $('colCurrent').textContent = mesAtual; $('colPrevious').textContent = mesAnterior;
    [['tp1',numero.format(atual.pecas)],['tp2',numero.format(prev.pecas)],['tg1',moeda.format(atual.bruto)],['tg2',moeda.format(prev.bruto)],['te1',moeda.format(atual.despesas)],['te2',moeda.format(prev.despesas)],['tr1',moeda.format(atual.resultado)],['tr2',moeda.format(prev.resultado)]].forEach(([id,v])=>$(id).textContent=v);
    [['tp3',atual.pecas,prev.pecas,false],['tg3',atual.bruto,prev.bruto,false],['te3',atual.despesas,prev.despesas,true],['tr3',atual.resultado,prev.resultado,false]].forEach(([id,a,b,lower])=>{const el=$(id);el.textContent=textoVariacao(a,b);el.className=classeVariacao(a,b,lower)});
    const change = variacao(atual.resultado, prev.resultado), trend = $('trend');
    trend.textContent = change === null ? (atual.temDados ? 'Resultado iniciado' : 'Sem dados comparáveis') : change >= 0 ? 'Resultado em alta' : 'Resultado em queda';
    trend.className = `badge ${change !== null && change >= 0 ? 'good' : ''}`;
    $('insight').textContent = !atual.temDados
        ? 'Não há registros de produção ou despesas para este mês. Quando houver lançamentos com datas válidas, o resumo será atualizado automaticamente.'
        : `Neste mês foram registradas ${numero.format(atual.pecas)} peças, com valor bruto de ${moeda.format(atual.bruto)} e ${moeda.format(atual.despesas)} em despesas. O resultado estimado é ${moeda.format(atual.resultado)}.`;
    graficoProducao(atual.semanas);
    graficoFinanceiro(atual.bruto, atual.despesas);
    const notice = $('dataNotice');
    notice.textContent = registrosSemData > 0
        ? `Os dados vêm dos registros existentes. ${registrosSemData} lançamento(s) antigo(s) sem ano/data confiável ficaram fora do relatório para evitar atribuição incorreta de mês. Nenhum registro foi alterado.`
        : 'Os valores são lidos dos registros existentes no Anotei. Nenhum dado é criado ou alterado por esta tela.';
}
async function iniciar() {
    registrosSemData = 0;
    try {
        const semanas = await obterSemanasSalvas();
        const arquivados = [];
        semanas.forEach(semana => {
            (Array.isArray(semana.registros) ? semana.registros : []).forEach(reg => {
                const normalizado = normalizarLancamento(reg, semana);
                if (normalizado) arquivados.push(normalizado);
            });
        });
        const atuais = carregarLancamentos();
        // Lançamentos atuais são separados dos arquivados pelo próprio fluxo de fechar semana.
        lancamentos = [...arquivados, ...atuais];
        despesas = carregarDespesas();
        preencherSelects();
        renderizar();
    } catch (error) {
        console.error('Erro ao montar os relatórios:', error);
        $('dataNotice').textContent = 'Não foi possível carregar todos os dados. Tente atualizar a página.';
    }
}
$('month').addEventListener('change', renderizar);
$('year').addEventListener('change', renderizar);
$('current').addEventListener('click', () => {
    $('month').value = String(hoje.getMonth()+1).padStart(2,'0');
    $('year').value = String(hoje.getFullYear());
    renderizar();
});
iniciar();
