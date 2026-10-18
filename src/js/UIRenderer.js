// UIRenderer.js - Responsável por desenhar os componentes na tela
import { SemanaProducao } from "./Producao.js";

export class UIRenderer {

    static renderizarListaAtual(listaAtualEl, lancamentosFiltrados, appInstance) {
        if (!listaAtualEl) return;

        let htmlAtuais = '';
        const LIMITE_INICIAL = 3;
        const deveLimitar = !appInstance.mostrarTodosLancamentos && lancamentosFiltrados.length > LIMITE_INICIAL;
        const lancamentosParaExibir = deveLimitar ?
            lancamentosFiltrados.slice(-LIMITE_INICIAL) :
            lancamentosFiltrados;

        lancamentosParaExibir.forEach(reg => {
            const index = appInstance.lancamentosAtuais.indexOf(reg);
            const detalhesList = reg.detalhes ?
                reg.detalhes.map(d => `<li>${d}</li>`).join('') :
                '';

            htmlAtuais += `
                <div class="history-item" style="display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--border-color);">
                    <div style="flex:1; margin-right:8px;">
                        <strong>${reg.data}</strong> - ${appInstance.formatarNumero(reg.pecas)} pçs (R$ ${Number(reg.valorTotal || 0).toFixed(2)})
                        <ul>${detalhesList}</ul>
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button onclick="window.app.editarLancamento(${index})" title="Editar" style="width:auto; padding:6px 8px; background:transparent; color:var(--warning-color); font-size:0.9rem; margin:0; cursor:pointer; border:none;">✏️</button>
                        <button onclick="window.app.removerLancamento(${index})" title="Excluir" style="width:auto; padding:6px 8px; background:transparent; color:var(--danger-color); font-size:0.9rem; margin:0; cursor:pointer; border:none;">🗑️</button>
                    </div>
                </div>
            `;
        });

        if (lancamentosFiltrados.length > LIMITE_INICIAL) {
            const textoBotao = appInstance.mostrarTodosLancamentos ?
                '▲ Mostrar Menos' :
                `▼ Mostrar Mais (${lancamentosFiltrados.length - LIMITE_INICIAL} ocultos)`;

            htmlAtuais += `
                <button type="button" onclick="window.app.alternarMostrarTodos()" style="width:100%; margin-top:10px; padding:8px; background:var(--secondary-bg); color:var(--text-color); border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; cursor:pointer;">
                    ${textoBotao}
                </button>
            `;
        }

        listaAtualEl.innerHTML = htmlAtuais || `
            <p style="color:var(--muted-color); text-align:center; font-size:0.9rem;">
                Nenhum lançamento na semana atual.
            </p>
        `;
    }

    static renderizarResumoPreco(resumoSemanalPrecoEl, gruposPorPreco, chavesPreco, totalLancamentosGeral, appInstance) {
        if (!resumoSemanalPrecoEl) return;

        if (chavesPreco.length === 0) {
            resumoSemanalPrecoEl.innerHTML = '';
            return;
        }

        let htmlResumo = `
            <div class="resumo-preco-titulo">
                📦 Resumo por valor unitário
            </div>
        `;

        const LIMITE_ITENS_RESUMO = 7;
        let itensExibidosContador = 0;
        let deveMostrarBotaoResumo = totalLancamentosGeral > LIMITE_ITENS_RESUMO;

        chavesPreco.forEach(chave => {
            const grupo = gruposPorPreco[chave];

            htmlResumo += `
                <div class="resumo-preco-grupo">
                    <div class="resumo-preco-grupo-titulo">
                        💰 R$ ${grupo.valorUnitario.toFixed(2)} por peça
                    </div>
            `;

            grupo.lancamentos.forEach(reg => {
                const estaOculto = !appInstance.mostrarTodosResumo && itensExibidosContador >= LIMITE_ITENS_RESUMO;

                if (!estaOculto) {
                    htmlResumo += `
                        <div class="resumo-preco-item">
                            <span>${reg.data} - ${appInstance.formatarNumero(reg.pecas)} pçs</span>
                            <span>R$ ${reg.valorTotal.toFixed(2)}</span>
                        </div>
                    `;
                }
                itensExibidosContador++;
            });

            htmlResumo += `
                    <div class="resumo-preco-total">
                        <span>Total: ${appInstance.formatarNumero(grupo.pecas)} pçs</span>
                        <span>R$ ${grupo.valor.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });

        if (deveMostrarBotaoResumo) {
            const itensOcultos = totalLancamentosGeral - LIMITE_ITENS_RESUMO;
            const textoBotaoResumo = appInstance.mostrarTodosResumo ?
                '▲ Mostrar Menos' :
                `▼ Mostrar Mais (${itensOcultos} itens ocultos)`;

            htmlResumo += `
                <button type="button" onclick="window.app.alternarMostrarResumo()" style="width:100%; margin-top:10px; padding:8px; background:var(--secondary-bg); color:var(--text-color); border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; cursor:pointer;">
                    ${textoBotaoResumo}
                </button>
            `;
        }

        resumoSemanalPrecoEl.innerHTML = htmlResumo;
    }
       

    static async renderizarHistoricoSemanas(
        historicoEl,
        appInstance
    ) {
        if (!historicoEl) return;

        const cardArquivo =
            document.getElementById('cardArquivo');

        const semanasSalvas =
            await appInstance.storage.obterTodasSemanas() || [];

        if (semanasSalvas.length === 0) {
            if (cardArquivo) {
                cardArquivo.style.display = 'none';
            }

            historicoEl.innerHTML = `
            <div class="historico-vazio">
                <p>Nenhuma semana fechada ainda.</p>
            </div>
        `;

            return;
        }

        if (cardArquivo) {
            cardArquivo.style.display = 'block';
        }

        /* =====================================================
           RESUMO POR MÊS
           ===================================================== */

        const resumoMensal = {};

        semanasSalvas.forEach(semana => {

            const periodo =
                semana.periodo || '';

            const primeiroDia =
                periodo.split(' a ')[0];

            const partes =
                primeiroDia.split('/');

            let chaveMes = 'Outros';

            if (partes.length === 2) {

                const mes =
                    parseInt(partes[1], 10);

                const ano =
                    new Date().getFullYear();

                const meses = [
                    'Janeiro',
                    'Fevereiro',
                    'Março',
                    'Abril',
                    'Maio',
                    'Junho',
                    'Julho',
                    'Agosto',
                    'Setembro',
                    'Outubro',
                    'Novembro',
                    'Dezembro'
                ];

                if (
                    mes >= 1 &&
                    mes <= 12
                ) {
                    chaveMes =
                        `${meses[mes - 1]} de ${ano}`;
                }
            }

            if (!resumoMensal[chaveMes]) {

                resumoMensal[chaveMes] = {
                    valor: 0,
                    pecas: 0,
                    semanasCount: 0
                };

            }

            resumoMensal[chaveMes].valor +=
                Number(semana.valorTotal || 0);

            resumoMensal[chaveMes].pecas +=
                Number(semana.pecasTotal || 0);

            resumoMensal[chaveMes].semanasCount += 1;

        });

        let htmlResumoMensal = '';

        Object.entries(resumoMensal).forEach(
            ([mes, dados]) => {

                htmlResumoMensal += `
                <div
                    style="
                        background:rgba(33,150,243,0.1);
                        padding:8px 12px;
                        border-radius:6px;
                        margin-bottom:8px;
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        font-size:0.9rem;
                    "
                >

                    <div>

                        <strong
                            style="
                                color:var(--info-color);
                            "
                        >
                            ${mes}
                        </strong>

                        <div
                            style="
                                font-size:0.75rem;
                                color:var(--muted-color);
                            "
                        >
                            ${dados.semanasCount}
                            semana(s) fechada(s)
                        </div>

                    </div>

                    <div
                        style="
                            text-align:right;
                        "
                    >

                        <span
                            style="
                                color:var(--accent-color);
                                font-weight:bold;
                            "
                        >
                            R$ ${dados.valor.toFixed(2)}
                        </span>

                        <div
                            style="
                                font-size:0.75rem;
                                color:var(--muted-color);
                            "
                        >
                            ${appInstance.formatarNumero(
                                dados.pecas
                            )} pçs
                        </div>

                    </div>

                </div>
            `;

            }
        );

        let html = '';

        if (htmlResumoMensal) {

            html += `
            <div
                style="
                    margin-bottom:16px;
                    border-bottom:1px solid var(--border-color);
                    padding-bottom:12px;
                "
            >

                <h4
                    style="
                        margin:0 0 8px 0;
                        font-size:0.9rem;
                        color:var(--text-color);
                    "
                >
                    📊 Resumo por Mês
                </h4>

                ${htmlResumoMensal}

            </div>
        `;

        }

        /* =====================================================
           SEMANAS SALVAS
           ===================================================== */

        semanasSalvas
            .sort((a, b) => b.id - a.id)
            .forEach(semana => {

                const semObj =
                    new SemanaProducao(
                        semana.registros || []
                    );

                semObj.id = semana.id;
                semObj.periodo = semana.periodo;
                semObj.pecasTotal =
                    Number(semana.pecasTotal || 0);
                semObj.valorTotal =
                    Number(semana.valorTotal || 0);

                let itensDetalhadosHtml = '';

                (semana.registros || [])
                .forEach(reg => {

                    const pecas =
                        Number(reg.pecas || 0);

                    const valorUnitario =
                        Number(
                            reg.valorUnitario || 0
                        );

                    const valorReg =
                        Number(
                            reg.valorTotal ??
                            pecas * valorUnitario
                        );

                    const infoPreco =
                        valorUnitario > 0 ?
                        `(R$ ${valorUnitario.toFixed(2)} un)` :
                        '';

                    const detalhesList =
                        Array.isArray(reg.detalhes) ?
                        reg.detalhes
                        .map(
                            detalhe =>
                            `<li>${detalhe}</li>`
                        )
                        .join('') :
                        '';

                    itensDetalhadosHtml += `
                        <div
                            style="
                                padding:8px 0;
                                border-bottom:1px solid var(--border-color);
                            "
                        >

                            <div>
                                <strong>
                                    📅 ${reg.data || ''}
                                </strong>
                            </div>

                            <div>
                                ${appInstance.formatarNumero(
                                    pecas
                                )} pçs
                                ${infoPreco}
                                —
                                <strong>
                                    R$ ${valorReg.toFixed(2)}
                                </strong>
                            </div>

                            ${
                                detalhesList
                                    ? `
                                        <ul
                                            style="
                                                margin:4px 0 0 20px;
                                                font-size:0.85rem;
                                            "
                                        >
                                            ${detalhesList}
                                        </ul>
                                    `
                                    : ''
                            }

                        </div>
                    `;

                });

                html += `
                <div class="archive-box">

                    <details>

                        <summary>

                            <span>
                                📅 ${semObj.periodo}
                            </span>

                            <span>
                                R$ ${semObj.valorTotal.toFixed(2)}
                                (${appInstance.formatarNumero(
                                    semObj.pecasTotal
                                )} pçs)
                            </span>

                        </summary>

                        <div>

                            ${itensDetalhadosHtml}

                            <button
                                class="btn-whatsapp"
                                onclick="window.open(
                                    'https://api.whatsapp.com/send?text=${encodeURIComponent(
                                        semObj.gerarMensagemWhatsApp()
                                    )}',
                                    '_blank'
                                )"
                            >
                                📲 Enviar por WhatsApp
                            </button>

                        </div>

                    </details>

                </div>
            `;

            });

        historicoEl.innerHTML = html;
    }

    static renderizarResumoPainel(appInstance, lancamentosDaSemana = []) {
        const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL'
        }).format(Number(valor) || 0);

        const agora = new Date();
        const hoje = [
            agora.getFullYear(),
            String(agora.getMonth() + 1).padStart(2, '0'),
            String(agora.getDate()).padStart(2, '0')
        ].join('-');

        const hojeLegado = agora.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit'
        });

        const registros = Array.isArray(lancamentosDaSemana)
            ? lancamentosDaSemana
            : [];

        const totalHoje = registros
            .filter((reg) => {
                if (reg.dataISO) {
                    return String(reg.dataISO) === hoje;
                }

                // Compatibilidade com lançamentos antigos sem dataISO.
                return String(reg.data || '') === hojeLegado;
            })
            .reduce(
                (soma, reg) =>
                    soma + (Number(reg.valorTotal) || 0),
                0
            );
        const totalSemana = registros
            .reduce((soma, reg) => soma + (Number(reg.valorTotal) || 0), 0);
        const meta = Number(appInstance.metaSemanal) || 0;
        const percentualReal = meta > 0 ? (totalSemana / meta) * 100 : 0;
        const percentualVisual = Math.max(0, Math.min(100, percentualReal));

        const hojeEl = document.getElementById('todayAmount');
        const semanaEl = document.getElementById('weekAmount');
        const progressoEl = document.getElementById('progressLabel');
        const barraEl = document.getElementById('progressFill');
        const barraContainer = document.getElementById('progressBar');

        if (hojeEl) hojeEl.textContent = formatarMoeda(totalHoje);
        if (semanaEl) semanaEl.textContent = formatarMoeda(totalSemana);
        if (progressoEl) progressoEl.textContent = `${Math.round(percentualReal)}% de ${formatarMoeda(meta)}`;
        if (barraEl) barraEl.style.width = `${percentualVisual}%`;
        if (barraContainer) barraContainer.setAttribute('aria-valuenow', String(Math.round(percentualVisual)));
    }

}