import {
    DadosService
} from './DadosService.js';

import {
    DespesasPessoaisService
} from './DespesasPessoaisService.js';


document.addEventListener(
    "DOMContentLoaded",
    () => {

        function configurarSecao(botaoId, painelId) {

            const botao =
                document.getElementById(botaoId);

            const painel =
                document.getElementById(painelId);

            if (!botao || !painel) {
                return;
            }

            botao.addEventListener(
                "click",
                () => {

                    const aberto =
                        painel.classList.toggle("ativo");

                    botao.classList.toggle(
                        "aberto",
                        aberto
                    );

                    botao.setAttribute(
                        "aria-expanded",
                        aberto ? "true" : "false"
                    );
                }
            );
        }

        /* =================================================
           SEÇÕES DA CONFIGURAÇÃO
        ================================================= */

        configurarSecao(
            "btnConfigProducao",
            "painelConfigProducao"
        );

        configurarSecao(
            "btnConfigAparencia",
            "painelConfigAparencia"
        );

        configurarSecao(
            "btnConfigNotificacoes",
            "painelConfigNotificacoes"
        );

        configurarSecao(
            "btnConfigDados",
            "painelConfigDados"
        );

        configurarSecao(
            "btnMenuSobre",
            "painelMenuSobre"
        );

        /* =================================================
           DADOS
        ================================================= */

        const dadosService =
            window.app?.storage ?
                new DadosService(
                    window.app.storage
                ) :
                null;

        const despesasPessoaisService =
            new DespesasPessoaisService();

        const inputDescricao =
            document.getElementById(
                "despesaDescricao"
            );

        const inputCategoria =
            document.getElementById(
                "despesaCategoria"
            );

        const inputValor =
            document.getElementById(
                "despesaValor"
            );

        const inputData =
            document.getElementById(
                "despesaData"
            );

        const inputObservacao =
            document.getElementById(
                "despesaObservacao"
            );

        const btnAdicionarDespesa =
            document.getElementById(
                "btnAdicionarDespesa"
            );

        function obterTipoDespesa() {

            const campo =
                document.getElementById(
                    "despesaTipo"
                );

            return campo?.value || "variavel";
        }

        function adicionarDespesaPessoal() {

            const descricao =
                inputDescricao?.value.trim();

            const categoria =
                inputCategoria?.value || "outros";

            const valor =
                Number(inputValor?.value);

            const data =
                inputData?.value;

            const tipo =
                obterTipoDespesa();

            const observacao =
                inputObservacao?.value.trim() || "";

            if (!descricao) {

                alert(
                    "Informe a descrição da despesa."
                );

                inputDescricao?.focus();

                return;
            }

            if (!Number.isFinite(valor) || valor <= 0) {

                alert(
                    "Informe um valor válido."
                );

                inputValor?.focus();

                return;
            }

            if (!data) {

                alert(
                    "Informe a data da despesa."
                );

                inputData?.focus();

                return;
            }

            const appFinanceiro = window.app;

            const semanaReferenciaDespesa =
                appFinanceiro?.configSemanaPadrao === "escolhida" &&
                appFinanceiro?.configDataSemana
                    ? appFinanceiro.configDataSemana
                    : appFinanceiro?.producaoController?.obterSemanaReferencia?.() || null;

            despesasPessoaisService.adicionar({
                descricao,
                categoria,
                valor,
                data,
                tipo,
                observacao,
                semanaReferencia: semanaReferenciaDespesa
            });

            if (inputDescricao) {
                inputDescricao.value = "";
            }

            if (inputValor) {
                inputValor.value = "";
            }

            if (inputObservacao) {
                inputObservacao.value = "";
            }

            renderizarDespesasPessoais();
            atualizarResumoDespesas();
            atualizarResumoDespesasFinanceiras();
            atualizarDashboardFinanceiro();

            alert(
                "Despesa adicionada com sucesso."
            );
        }

        function obterDespesasDaProducaoAtual(despesas) {
            const appFinanceiro = window.app;

            const referencia =
                appFinanceiro?.configSemanaPadrao === "escolhida" &&
                appFinanceiro?.configDataSemana
                    ? appFinanceiro.configDataSemana
                    : appFinanceiro?.producaoController?.obterSemanaReferencia?.();

            if (!referencia) {
                return [];
            }

            const hoje = new Date().toISOString().slice(0, 10);
            const dataLimite =
                appFinanceiro?.configSemanaPadrao === "escolhida"
                    ? (() => {
                        const fim = new Date(`${referencia}T00:00:00`);
                        fim.setDate(fim.getDate() + 6);
                        return fim.toISOString().slice(0, 10);
                    })()
                    : hoje;

            return despesas.filter(despesa => {
                if (despesa.semanaReferencia) {
                    return despesa.semanaReferencia === referencia;
                }

                const data = String(despesa.data || "");
                return Boolean(data && data >= referencia && data <= dataLimite);
            });
        }

        function atualizarResumoDespesas() {

            const despesas =
                despesasPessoaisService.obterTodas();

            const agora =
                new Date();

            const anoAtual =
                agora.getFullYear();

            const mesAtual =
                String(
                    agora.getMonth() + 1
                ).padStart(2, "0");

            const prefixoMes =
                `${anoAtual}-${mesAtual}`;

            const despesasDoMes =
                despesas.filter(
                    despesa =>
                        String(despesa.data || "").startsWith(prefixoMes)
                );

            const total =
                despesasDoMes.reduce(
                    (soma, despesa) =>
                        soma +
                        Number(
                            despesa.valor || 0
                        ),
                    0
                );

            const totalFixas =
                despesasDoMes
                    .filter(
                        despesa =>
                            despesa.tipo === "fixa"
                    )
                    .reduce(
                        (soma, despesa) =>
                            soma +
                            Number(
                                despesa.valor || 0
                            ),
                        0
                    );

            const totalVariaveis =
                despesasDoMes
                    .filter(
                        despesa =>
                            despesa.tipo !== "fixa"
                    )
                    .reduce(
                        (soma, despesa) =>
                            soma +
                            Number(
                                despesa.valor || 0
                            ),
                        0
                    );

            const percentualFixas =
                total > 0
                    ? (totalFixas / total) * 100
                    : 0;

            const percentualVariaveis =
                total > 0
                    ? (totalVariaveis / total) * 100
                    : 0;

            const categorias = {};

            despesasDoMes.forEach(
                despesa => {

                    const categoria =
                        despesa.categoria || "outros";

                    categorias[categoria] =
                        (
                            categorias[categoria] || 0
                        ) +
                        Number(
                            despesa.valor || 0
                        );
                }
            );

            let maiorCategoria = "outros";
            let maiorValor = 0;

            Object.entries(categorias)
                .forEach(
                    ([categoria, valor]) => {

                        if (valor > maiorValor) {

                            maiorCategoria =
                                categoria;

                            maiorValor =
                                valor;
                        }
                    }
                );

            const categoriasInfo = {
                casa: "🏠 Casa",
                alimentacao: "🍔 Alimentação",
                transporte: "🚗 Transporte",
                estudos: "📚 Estudos",
                lazer: "🎮 Lazer",
                comunicacao: "📱 Comunicação",
                outros: "📦 Outros"
            };

            const nomeMaiorCategoria =
                categoriasInfo[maiorCategoria] ||
                "📦 Outros";

            const formatarMoeda =
                valor =>
                    Number(valor || 0)
                        .toLocaleString(
                            "pt-BR",
                            {
                                style: "currency",
                                currency: "BRL"
                            }
                        );

            const atualizarTexto =
                (id, valor) => {

                    const elemento =
                        document.getElementById(id);

                    if (elemento) {
                        elemento.textContent =
                            valor;
                    }
                };

            atualizarTexto(
                "despesasTotal",
                formatarMoeda(total)
            );

            atualizarTexto(
                "despesasFixas",
                formatarMoeda(totalFixas)
            );

            atualizarTexto(
                "despesasVariaveis",
                formatarMoeda(totalVariaveis)
            );

            atualizarTexto(
                "despesasFixasPercentual",
                `${Math.round(percentualFixas)}% do total`
            );

            atualizarTexto(
                "despesasVariaveisPercentual",
                `${Math.round(percentualVariaveis)}% do total`
            );

            atualizarTexto(
                "despesasMaiorCategoria",
                nomeMaiorCategoria
            );

            atualizarTexto(
                "despesasMaiorCategoriaValor",
                formatarMoeda(maiorValor)
            );

            const nomeMes =
                agora.toLocaleDateString(
                    "pt-BR",
                    {
                        month: "long"
                    }
                );

            atualizarTexto(
                "despesasPeriodo",
                `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} ${anoAtual}`
            );

            const dadosFinanceiros =
                window.app?.dadosFinanceiros;

            const valorProduzido =
                Number(dadosFinanceiros?.valorProduzido || 0);

            const despesasDaProducao =
                obterDespesasDaProducaoAtual(despesas);

            const totalDespesasProducao =
                despesasDaProducao.reduce(
                    (soma, despesa) =>
                        soma + (Number(despesa.valor) || 0),
                    0
                );

            const saldoAposDespesas =
                valorProduzido - totalDespesasProducao;

            atualizarTexto(
                "despesasResumoProducao",
                formatarMoeda(valorProduzido)
            );

            atualizarTexto(
                "despesasResumoTotal",
                formatarMoeda(totalDespesasProducao)
            );

            atualizarTexto(
                "despesasResumoSaldo",
                formatarMoeda(saldoAposDespesas)
            );

            atualizarTexto(
                "despesasResumoPeriodo",
                "Produção atual"
            );
        }

        function atualizarResumoDespesasFinanceiras() {

            const despesas =
                despesasPessoaisService.obterTodas();

            const agora =
                new Date();

            const anoAtual =
                agora.getFullYear();

            const mesAtual =
                String(
                    agora.getMonth() + 1
                ).padStart(2, "0");

            const prefixoMes =
                `${anoAtual}-${mesAtual}`;

            const despesasDoMes =
                despesas.filter(
                    despesa =>
                        typeof despesa.data === "string" &&
                        despesa.data.startsWith(prefixoMes)
                );

            const totalMes =
                despesasDoMes.reduce(
                    (soma, despesa) =>
                        soma +
                        (
                            Number(
                                despesa.valor
                            ) || 0
                        ),
                    0
                );

            const elementoMes =
                document.getElementById(
                    "financeiroDespesasMes"
                );

            const elementoQuantidade =
                document.getElementById(
                    "financeiroQuantidadeDespesas"
                );

            if (elementoMes) {

                elementoMes.textContent =
                    formatarMoedaDespesa(
                        totalMes
                    );
            }

            if (elementoQuantidade) {

                elementoQuantidade.textContent =
                    String(
                        despesasDoMes.length
                    );
            }
        }

        if (btnAdicionarDespesa) {

            btnAdicionarDespesa.addEventListener(
                "click",
                adicionarDespesaPessoal
            );
        }

        function formatarMoedaDespesa(valor) {

            return Number(
                valor || 0
            ).toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
        }

        let filtroDespesasAtual = "mes";

        function renderizarDespesasPessoais() {

            const lista =
                document.getElementById(
                    "listaDespesasPessoais"
                );

            if (!lista) {
                return;
            }

            const despesas =
                despesasPessoaisService.obterTodas();

            const agora =
                new Date();

            const hoje =
                agora.toISOString()
                    .slice(0, 10);

            const prefixoMes =
                hoje.slice(0, 7);

            const inicioSemana =
                new Date(agora);

            const diaSemana =
                inicioSemana.getDay();

            const diferenca =
                diaSemana === 0
                    ? 6
                    : diaSemana - 1;

            inicioSemana.setDate(
                inicioSemana.getDate() -
                diferenca
            );

            const inicioSemanaTexto =
                inicioSemana
                    .toISOString()
                    .slice(0, 10);

            let despesasFiltradas =
                [...despesas];

            if (
                filtroDespesasAtual === "mes"
            ) {

                despesasFiltradas =
                    despesasFiltradas.filter(
                        despesa =>
                            String(
                                despesa.data || ""
                            ).startsWith(
                                prefixoMes
                            )
                    );
            }

            if (
                filtroDespesasAtual === "semana"
            ) {

                despesasFiltradas =
                    despesasFiltradas.filter(
                        despesa =>
                            despesa.data >=
                            inicioSemanaTexto &&
                            despesa.data <=
                            hoje
                    );
            }

            if (
                filtroDespesasAtual === "hoje"
            ) {

                despesasFiltradas =
                    despesasFiltradas.filter(
                        despesa =>
                            despesa.data === hoje
                    );
            }

            despesasFiltradas.sort(
                (a, b) =>
                    String(
                        b.data || ""
                    ).localeCompare(
                        String(
                            a.data || ""
                        )
                    )
            );

            const escaparHtml =
                valor =>
                    String(valor ?? "")
                        .replaceAll(
                            "&",
                            "&amp;"
                        )
                        .replaceAll(
                            "<",
                            "&lt;"
                        )
                        .replaceAll(
                            ">",
                            "&gt;"
                        )
                        .replaceAll(
                            '"',
                            "&quot;"
                        )
                        .replaceAll(
                            "'",
                            "&#039;"
                        );

            const icones = {
                casa: "🏠",
                alimentacao: "🍔",
                transporte: "🚗",
                estudos: "📚",
                lazer: "🎮",
                comunicacao: "📱",
                outros: "📦"
            };

            const nomesCategorias = {
                casa: "Casa",
                alimentacao: "Alimentação",
                transporte: "Transporte",
                estudos: "Estudos",
                lazer: "Lazer",
                comunicacao: "Comunicação",
                outros: "Outros"
            };

            if (
                despesasFiltradas.length === 0
            ) {

                lista.innerHTML = `
                    <div class="financeiro-despesas-vazio">
                        Nenhuma despesa encontrada.
                    </div>
                `;

                return;
            }

            lista.innerHTML =
                despesasFiltradas
                    .map(
                        despesa => {

                            const categoria =
                                despesa.categoria ||
                                "outros";

                            const icone =
                                icones[categoria] ||
                                "📦";

                            const nomeCategoria =
                                nomesCategorias[categoria] ||
                                "Outros";

                            const dataFormatada =
                                despesa.data
                                    ? despesa.data
                                        .split("-")
                                        .reverse()
                                        .join("/")
                                    : "";

                            const valor =
                                Number(
                                    despesa.valor || 0
                                ).toLocaleString(
                                    "pt-BR",
                                    {
                                        style: "currency",
                                        currency: "BRL"
                                    }
                                );

                            const observacao =
                                despesa.observacao
                                    ? `
                                        <small>
                                            ${escaparHtml(
                                                despesa.observacao
                                            )}
                                        </small>
                                    `
                                    : "";

                            return `
                                <div class="expense">
                                    <div class="expense-name">
                                        <strong>
                                            ${escaparHtml(
                                                despesa.descricao
                                            )}
                                        </strong>
                                        ${observacao}
                                    </div>

                                    <span class="tag">
                                        ${icone}
                                        ${nomeCategoria}
                                    </span>

                                    <span class="date">
                                        ${dataFormatada}
                                    </span>

                                    <strong class="amount">
                                        ${valor}
                                    </strong>
                                </div>
                            `;
                        }
                    )
                    .join("");
        }

        const botoesFiltroDespesas =
            document.querySelectorAll(
                "[data-filtro-despesa]"
            );

        botoesFiltroDespesas.forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        filtroDespesasAtual =
                            botao.dataset.filtroDespesa;

                        botoesFiltroDespesas.forEach(
                            outroBotao => {

                                outroBotao.classList.toggle(
                                    "ativo",
                                    outroBotao === botao
                                );
                            }
                        );

                        renderizarDespesasPessoais();
                    }
                );
            }
        );

        renderizarDespesasPessoais();

        const btnExportar =
            document.getElementById(
                "btnConfigExportar"
            );

        const btnImportar =
            document.getElementById(
                "btnConfigImportar"
            );

        const btnLimpar =
            document.getElementById(
                "btnConfigLimpar"
            );

        const arquivoImportacao =
            document.getElementById(
                "configArquivoImportacao"
            );

        if (
            btnExportar &&
            dadosService
        ) {

            btnExportar.addEventListener(
                "click",
                async () => {

                    try {

                        await dadosService.exportar();

                    } catch (erro) {

                        console.error(
                            "Erro ao exportar dados:",
                            erro
                        );

                        alert(
                            "Não foi possível exportar os dados."
                        );
                    }
                }
            );
        }

        if (
            btnImportar &&
            arquivoImportacao &&
            dadosService
        ) {

            btnImportar.addEventListener(
                "click",
                () => {
                    arquivoImportacao.click();
                }
            );

            arquivoImportacao.addEventListener(
                "change",
                async (event) => {

                    const file =
                        event.target.files?.[0];

                    if (!file) {
                        return;
                    }

                    const confirmar =
                        confirm(
                            "Importar este backup substituirá os dados atuais do aplicativo. Deseja continuar?"
                        );

                    if (!confirmar) {

                        event.target.value = "";

                        return;
                    }

                    try {

                        await dadosService.importarArquivo(
                            file
                        );

                        alert(
                            "Dados importados com sucesso. O aplicativo será recarregado."
                        );

                        window.location.reload();

                    } catch (erro) {

                        console.error(
                            "Erro ao importar dados:",
                            erro
                        );

                        alert(
                            erro.message ||
                            "Não foi possível importar os dados."
                        );

                    } finally {

                        event.target.value = "";
                    }
                }
            );
        }

        if (
            btnLimpar &&
            dadosService
        ) {

            btnLimpar.addEventListener(
                "click",
                async () => {

                    const confirmar =
                        confirm(
                            "Isso apagará os dados e configurações salvos neste dispositivo. Deseja continuar?"
                        );

                    if (!confirmar) {
                        return;
                    }

                    const confirmarNovamente =
                        confirm(
                            "Tem certeza? Esta ação não pode ser desfeita."
                        );

                    if (!confirmarNovamente) {
                        return;
                    }

                    try {

                        await dadosService.limparDados();

                        alert(
                            "Dados apagados com sucesso. O aplicativo será recarregado."
                        );

                        window.location.reload();

                    } catch (erro) {

                        console.error(
                            "Erro ao limpar dados:",
                            erro
                        );

                        alert(
                            "Não foi possível limpar todos os dados."
                        );
                    }
                }
            );
        }

        /* =================================================
           SEÇÕES PRINCIPAIS DO MENU
        ================================================= */

        configurarSecao(
            "btnMenuMeta",
            "painelMenuMeta"
        );

        configurarSecao(
            "btnMenuAjuda",
            "painelMenuAjuda"
        );

        /* =================================================
           NAVEGAÇÃO DA GESTÃO FINANCEIRA
        ================================================= */

        const btnMenuFinanceiro =
            document.getElementById(
                "btnMenuFinanceiro"
            );

        const btnAbrirDespesasPessoais =
            document.getElementById(
                "btnAbrirDespesasPessoais"
            );

        const btnVoltarGestaoFinanceira =
            document.getElementById(
                "btnVoltarGestaoFinanceira"
            );

        const btnVoltarProducao =
            document.getElementById(
                "btnVoltarProducao"
            );

        if (btnMenuFinanceiro) {

            btnMenuFinanceiro.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "gestao-financeira.html";
                }
            );
        }

        if (btnAbrirDespesasPessoais) {

            btnAbrirDespesasPessoais.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "despesas-pessoais.html";
                }
            );
        }

        if (btnVoltarGestaoFinanceira) {

            btnVoltarGestaoFinanceira.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "gestao-financeira.html";
                }
            );
        }

        if (btnVoltarProducao) {

            btnVoltarProducao.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "index.html";
                }
            );
        }

        /* =================================================
           DASHBOARD FINANCEIRO
        ================================================= */

        function formatarMoeda(valor) {

            return Number(
                valor || 0
            ).toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
        }

        function formatarNumero(valor) {

            return Math.round(
                Number(valor || 0)
            ).toLocaleString(
                "pt-BR"
            );
        }

        function atualizarDashboardFinanceiro() {
            const app = window.app;
            const dados = app?.dadosFinanceiros;
            if (!dados) return;

            const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
                style: "currency", currency: "BRL"
            });
            const numero = valor => Math.round(Number(valor || 0)).toLocaleString("pt-BR");
            const atualizar = (id, valor) => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = valor;
            };

            const modo = app.configuracaoService?.obter("modoCalculoFinanceiro") || "liquido";
            const radio = document.querySelector(`input[name="modoCalculoFinanceiro"][value="${modo}"]`);
            if (radio) radio.checked = true;
            document.getElementById("opcaoCalculoBruto")?.classList.toggle("selecionada", modo === "bruto");
            document.getElementById("opcaoCalculoLiquido")?.classList.toggle("selecionada", modo !== "bruto");

            const valorProduzido = Math.max(0, Number(dados.valorProduzido) || 0);
            const pecasProduzidas = Math.max(0, Number(dados.pecasProduzidas) || 0);
            const valorUnitario = Math.max(0, Number(dados.valorUnitario) || 0);
            const custosSemana = Math.max(0, Number(dados.custosDespesas ?? dados.custoFixoSemanal) || 0);
            const despesas = despesasPessoaisService.obterTodas();
            const agora = new Date();
            const anoMesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
            const despesasDoMes = despesas.filter(d => String(d.data || "").startsWith(anoMesAtual));
            const totalMensal = despesasDoMes.reduce((soma, d) => soma + Math.max(0, Number(d.valor) || 0), 0);

            const descontarCustos = modo !== "bruto";
            const disponivelSemanal = Math.max(0, valorProduzido - (descontarCustos ? custosSemana : 0));
            const alvoSemanalDisponivel = totalMensal / 4;
            const metaProducaoBruta = descontarCustos ? alvoSemanalDisponivel + custosSemana : alvoSemanalDisponivel;
            const semanas = disponivelSemanal > 0 && totalMensal > 0
                ? Math.ceil(totalMensal / disponivelSemanal)
                : null;

            atualizar("financeiroValorProduzido", moeda(valorProduzido));
            atualizar("financeiroDetalheProducao", `${numero(pecasProduzidas)} peças produzidas nesta semana`);
            atualizar("financeiroTotalDespesasMes", moeda(totalMensal));
            atualizar("financeiroDetalheDespesas", `${despesasDoMes.length} despesas registradas neste mês`);
            atualizar("financeiroMetaSemanalNecessaria", moeda(metaProducaoBruta));
            atualizar("financeiroDetalheMeta", descontarCustos
                ? `Inclui ${moeda(custosSemana)} de despesas consideradas na semana`
                : "Sem descontar despesas de produção");
            atualizar("financeiroSemanasNecessarias", totalMensal <= 0 ? "Nenhuma" : semanas === null ? "Não calculável" : `${semanas} ${semanas === 1 ? "semana" : "semanas"}`);
            atualizar("financeiroDetalhePrevisao", totalMensal <= 0
                ? "Cadastre as despesas deste mês para calcular a previsão"
                : semanas === null
                    ? "Não há valor semanal disponível para estimar o prazo"
                    : `Considerando ${moeda(disponivelSemanal)} disponíveis por semana`);

            if (totalMensal <= 0) {
                atualizar("financeiroOrientacaoTitulo", "Cadastre suas despesas para começar");
                atualizar("financeiroOrientacaoTexto", "Quando suas despesas estiverem registradas, o Anotei poderá calcular a meta semanal e estimar o prazo.");
            } else if (disponivelSemanal <= 0) {
                atualizar("financeiroOrientacaoTitulo", "Ainda não há valor disponível para essa previsão");
                atualizar("financeiroOrientacaoTexto", "Confira os valores da produção e as despesas consideradas na semana. Você também pode alternar o modo de cálculo.");
            } else if (disponivelSemanal >= alvoSemanalDisponivel) {
                atualizar("financeiroOrientacaoTitulo", "Seu ritmo semanal alcança a meta do exemplo de planejamento");
                atualizar("financeiroOrientacaoTexto", `A estimativa considera ${moeda(disponivelSemanal)} disponíveis por semana. Para juntar ${moeda(totalMensal)}, a média necessária é ${moeda(alvoSemanalDisponivel)} por semana em quatro semanas.`);
            } else {
                atualizar("financeiroOrientacaoTitulo", "Talvez seja necessário mais tempo ou uma produção maior");
                atualizar("financeiroOrientacaoTexto", `Com ${moeda(disponivelSemanal)} disponíveis por semana, a estimativa é de ${semanas} semanas para juntar ${moeda(totalMensal)}, se o ritmo continuar e não houver outras retiradas.`);
            }

            // Mantém a seção de despesas atualizada, sem alterar seus registros.
            atualizarResumoDespesasFinanceiras();
        }

        window.atualizarDashboardGestaoFinanceira = atualizarDashboardFinanceiro;

        document.querySelectorAll('input[name="modoCalculoFinanceiro"]').forEach(campo => {
            campo.addEventListener("change", () => {
                const app = window.app;
                if (!app?.configuracaoService) return;
                try {
                    app.configuracaoService.definir("modoCalculoFinanceiro", campo.value);
                    atualizarDashboardFinanceiro();
                } catch (erro) {
                    console.error("Não foi possível salvar o modo de cálculo financeiro:", erro);
                    alert("Não foi possível salvar essa preferência. Tente novamente.");
                }
            });
        });

        // CONTROLES VISÍVEIS DO PLANEJAMENTO FINANCEIRO
        const campoModoPlanejamento =
            document.getElementById("financeiroModoPlanejamento");

        const campoRetiradaPlanejada =
            document.getElementById("financeiroRetiradaValor");

        const salvarPlanejamentoFinanceiro = () => {
            const app = window.app;

            if (!app?.configuracaoService) {
                return;
            }

            try {
                const modo =
                    campoModoPlanejamento?.value || "meta_semanal";

                app.configuracaoService.definir(
                    "modoPlanejamentoFinanceiro",
                    modo
                );
                app.modoPlanejamentoFinanceiro = modo;

                if (campoRetiradaPlanejada) {
                    const valor = Number(campoRetiradaPlanejada.value);

                    if (!Number.isFinite(valor) || valor < 0) {
                        alert("Informe uma retirada válida, igual ou maior que zero.");
                        return;
                    }

                    app.configuracaoService.definir(
                        "retiradaSemanalDesejada",
                        valor
                    );
                    app.retiradaSemanalDesejada = valor;
                }

                app.render();
                atualizarDashboardFinanceiro();
            } catch (erro) {
                console.error("Erro ao salvar o planejamento financeiro:", erro);
                alert("Não foi possível salvar as configurações financeiras.");
            }
        };

        if (campoModoPlanejamento) {
            campoModoPlanejamento.value =
                window.app?.modoPlanejamentoFinanceiro || "meta_semanal";

            campoModoPlanejamento.addEventListener(
                "change",
                salvarPlanejamentoFinanceiro
            );
        }

        if (campoRetiradaPlanejada) {
            campoRetiradaPlanejada.value =
                Number(window.app?.retiradaSemanalDesejada || 0).toFixed(2);

            campoRetiradaPlanejada.addEventListener(
                "change",
                salvarPlanejamentoFinanceiro
            );
        }

        if (campoRetiradaPlanejada?.parentElement) {
            const atualizarVisibilidadeRetirada = () => {
                const metaAtiva =
                    (campoModoPlanejamento?.value || "meta_semanal") === "meta_semanal";

                campoRetiradaPlanejada.disabled = !metaAtiva;
                campoRetiradaPlanejada.parentElement.style.opacity =
                    metaAtiva ? "1" : "0.65";
            };

            campoModoPlanejamento?.addEventListener(
                "change",
                atualizarVisibilidadeRetirada
            );
            atualizarVisibilidadeRetirada();
        }

        atualizarDashboardFinanceiro();
        atualizarResumoDespesasFinanceiras();
        atualizarResumoDespesas();

        /* =================================================
           SINCRONIZA O ESTADO VISUAL DA CONFIGURAÇÃO
           COM O APP.JS
        ================================================= */

        const painelConfiguracao =
            document.getElementById(
                "painelConfiguracao"
            );

        const btnAbrirConfiguracao =
            document.getElementById(
                "btnAbrirConfiguracao"
            );

        function atualizarEstadoConfiguracao() {

            if (
                !painelConfiguracao ||
                !btnAbrirConfiguracao
            ) {
                return;
            }

            const aberto =
                painelConfiguracao.classList.contains(
                    "ativo"
                );

            btnAbrirConfiguracao.classList.toggle(
                "aberto",
                aberto
            );

            btnAbrirConfiguracao.setAttribute(
                "aria-expanded",
                aberto ? "true" : "false"
            );
        }

        if (painelConfiguracao) {

            const observador =
                new MutationObserver(
                    atualizarEstadoConfiguracao
                );

            observador.observe(
                painelConfiguracao,
                {
                    attributes: true,
                    attributeFilter: ["class"]
                }
            );

            atualizarEstadoConfiguracao();
        }

        /* =================================================
           AO VOLTAR DA CONFIGURAÇÃO,
           FECHA AS SUBSEÇÕES
        ================================================= */

        const btnFecharConfiguracao =
            document.getElementById(
                "btnFecharConfiguracao"
            );

        if (btnFecharConfiguracao) {

            btnFecharConfiguracao.addEventListener(
                "click",
                () => {

                    const secoes = [
                        [
                            "btnConfigProducao",
                            "painelConfigProducao"
                        ],
                        [
                            "btnConfigNotificacoes",
                            "painelConfigNotificacoes"
                        ],
                        [
                            "btnConfigDados",
                            "painelConfigDados"
                        ],
                        [
                            "btnMenuSobre",
                            "painelMenuSobre"
                        ]
                    ];

                    secoes.forEach(
                        ([botaoId, painelId]) => {

                            const botao =
                                document.getElementById(
                                    botaoId
                                );

                            const painel =
                                document.getElementById(
                                    painelId
                                );

                            if (
                                botao &&
                                painel
                            ) {

                                painel.classList.remove(
                                    "ativo"
                                );

                                botao.classList.remove(
                                    "aberto"
                                );

                                botao.setAttribute(
                                    "aria-expanded",
                                    "false"
                                );
                            }
                        }
                    );
                }
            );
        }
    }
);

/* =================================================
   ATUALIZAÇÕES DO APLICATIVO
================================================= */

const botaoAtualizacoes =
    document.getElementById(
        "btnMenuAtualizacoes"
    );

const versaoAplicativo =
    document.getElementById(
        "menuVersao"
    );

let registroServiceWorker = null;
let atualizacaoEmAndamento = false;

function atualizarVersaoExibida(registro) {

    if (
        !registro ||
        !registro.active ||
        !versaoAplicativo
    ) {
        return;
    }

    const canal =
        new MessageChannel();

    canal.port1.onmessage =
        event => {

            if (
                event.data &&
                event.data.type ===
                "SW_VERSION"
            ) {

                versaoAplicativo.textContent =
                    event.data.version;
            }
        };

    registro.active.postMessage(
        {
            type: "GET_VERSION"
        },
        [
            canal.port2
        ]
    );
}

function recarregarQuandoNovoServiceWorkerAssumir() {

    navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {

            if (
                atualizacaoEmAndamento
            ) {

                window.location.reload();
            }
        },
        {
            once: true
        }
    );
}

async function verificarAtualizacoes() {

    if (!registroServiceWorker) {

        throw new Error(
            "Service Worker ainda não está disponível."
        );
    }

    if (
        registroServiceWorker.waiting
    ) {

        atualizacaoEmAndamento =
            true;

        recarregarQuandoNovoServiceWorkerAssumir();

        registroServiceWorker.waiting.postMessage(
            {
                type: "SKIP_WAITING"
            }
        );

        return "Atualização encontrada. Recarregando...";
    }

    return new Promise(
        (resolve, reject) => {

            let encontrouAtualizacao =
                false;

            const instalando =
                registroServiceWorker.installing;

            const finalizar =
                mensagem => {

                    if (
                        encontrouAtualizacao
                    ) {

                        atualizacaoEmAndamento =
                            true;

                        recarregarQuandoNovoServiceWorkerAssumir();

                        const novoServiceWorker =
                            registroServiceWorker.waiting;

                        if (
                            novoServiceWorker
                        ) {

                            novoServiceWorker.postMessage(
                                {
                                    type: "SKIP_WAITING"
                                }
                            );

                            resolve(mensagem);

                            return;
                        }
                    }

                    resolve(mensagem);
                };

            if (instalando) {

                instalando.addEventListener(
                    "statechange",
                    () => {

                        if (
                            instalando.state ===
                            "installed"
                        ) {

                            if (
                                navigator.serviceWorker.controller
                            ) {

                                encontrouAtualizacao =
                                    true;

                                finalizar(
                                    "Atualização encontrada. Recarregando..."
                                );

                            } else {

                                finalizar(
                                    "Aplicativo instalado com sucesso."
                                );
                            }
                        }
                    }
                );
            }

            registroServiceWorker.addEventListener(
                "updatefound",
                () => {

                    encontrouAtualizacao =
                        true;

                    const novo =
                        registroServiceWorker.installing;

                    if (!novo) {
                        return;
                    }

                    novo.addEventListener(
                        "statechange",
                        () => {

                            if (
                                novo.state ===
                                "installed"
                            ) {

                                finalizar(
                                    "Atualização encontrada. Recarregando..."
                                );
                            }
                        }
                    );
                },
                {
                    once: true
                }
            );

            registroServiceWorker.update()
                .then(
                    () => {

                        setTimeout(
                            () => {

                                if (
                                    !encontrouAtualizacao
                                ) {

                                    resolve(
                                        "O aplicativo já está atualizado."
                                    );
                                }
                            },
                            500
                        );
                    }
                )
                .catch(
                    reject
                );
        }
    );
}

if (botaoAtualizacoes) {

    botaoAtualizacoes.addEventListener(
        "click",
        async () => {

            const textoOriginal =
                botaoAtualizacoes.textContent;

            botaoAtualizacoes.disabled =
                true;

            botaoAtualizacoes.textContent =
                "🔄 Verificando...";

            try {

                const mensagem =
                    await verificarAtualizacoes();

                if (mensagem) {

                    alert(
                        mensagem
                    );
                }

            } catch (erro) {

                console.error(
                    "Erro ao verificar atualizações:",
                    erro
                );

                alert(
                    "Não foi possível verificar atualizações."
                );

            } finally {

                if (
                    document.body.contains(
                        botaoAtualizacoes
                    )
                ) {

                    botaoAtualizacoes.disabled =
                        false;

                    botaoAtualizacoes.textContent =
                        textoOriginal;
                }
            }
        }
    );
}

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        async () => {

            try {

                registroServiceWorker =
                    await navigator.serviceWorker.register(
                        "/sw.js"
                    );

                atualizarVersaoExibida(
                    registroServiceWorker
                );

            } catch (erro) {

                console.error(
                    "Falha ao registrar Service Worker:",
                    erro
                );
            }
        }
    );
}
