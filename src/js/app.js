import { StorageService } from './StorageService.js';
import { LancamentoDia, SemanaProducao } from './Producao.js';

class AppController {
    constructor() {
        this.storage = new StorageService();
        this.lancamentosAtuais = JSON.parse(localStorage.getItem('temp_lancamentos')) || [];
        this.termoBusca = '';
        this.sincronizadoComNuvem = JSON.parse(localStorage.getItem('sincronizado_nuvem')) ?? true;
        this.spreadsheetIdSalvo = localStorage.getItem('google_spreadsheet_id') || null;
        
        // Configuração Google Auth
        this.CLIENT_ID = '751192071126-02l99756dcqr65orhm2iqs5hajnjr54i.apps.googleusercontent.com';
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
        this.tokenClient = null;
        this.accessToken = localStorage.getItem('google_access_token') || null;
        
        window.app = this; 

        this.initGoogleAuth();
        this.initEvents();
        this.render();
    }

    initGoogleAuth() {
        if (typeof google !== 'undefined' && google.accounts) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error(response);
                        alert('Erro na autenticação com o Google.');
                        return;
                    }
                    this.accessToken = response.access_token;
                    localStorage.setItem('google_access_token', this.accessToken);
                    this.atualizarInterfaceLogin(true);
                    this.render();
                    alert('Conta Google conectada com sucesso!');
                },
            });
        }

        if (this.accessToken) {
            this.atualizarInterfaceLogin(true);
        } else {
            this.atualizarInterfaceLogin(false);
        }
    }

    atualizarInterfaceLogin(logado) {
        const statusEl = document.getElementById('statusLogin');
        const btnLogin = document.getElementById('btnLoginGoogle');
        const btnLogout = document.getElementById('btnLogoutGoogle');

        if (statusEl && btnLogin && btnLogout) {
            if (logado) {
                statusEl.innerText = 'Status: Conectado ao Google Drive ✅';
                statusEl.style.color = 'var(--accent-color)';
                btnLogin.style.display = 'none';
                btnLogout.style.display = 'inline-block';
            } else {
                statusEl.innerText = 'Status: Desconectado';
                statusEl.style.color = '#bbb';
                btnLogin.style.display = 'inline-flex';
                btnLogout.style.display = 'none';
            }
        }
    }

    fazerLoginGoogle() {
        if (!this.tokenClient) {
            alert('A biblioteca do Google ainda está carregando ou falhou. Verifique sua conexão.');
            return;
        }
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    fazerLogoutGoogle() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                this.accessToken = null;
                localStorage.removeItem('google_access_token');
                localStorage.removeItem('google_spreadsheet_id');
                this.spreadsheetIdSalvo = null;
                this.atualizarInterfaceLogin(false);
                this.render();
                alert('Você desconectou sua conta do Google.');
            });
        }
    }

    initEvents() {
        const safeBind = (id, event, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(event, callback);
            }
        };

        safeBind('btnSalvar', 'click', () => this.salvarLancamento());
        safeBind('btnFecharSemana', 'click', () => this.fecharSemana());
        
        // Eventos de Autenticação Google
        safeBind('btnLoginGoogle', 'click', () => this.fazerLoginGoogle());
        safeBind('btnLogoutGoogle', 'click', () => this.fazerLogoutGoogle());
        safeBind('btnEnviarNuvem', 'click', () => this.enviarParaGoogleSheetsAutomatico());
        safeBind('btnAbrirPlanilhaDrive', 'click', () => this.abrirPlanilhaNoNavegador());

        // Controle do Menu Hambúrguer
        const menuLateral = document.getElementById('menuLateral');
        const menuOverlay = document.getElementById('menuOverlay');
        
        safeBind('btnMenuHamburger', 'click', () => {
            if (menuLateral) menuLateral.classList.add('ativo');
            if (menuOverlay) menuOverlay.classList.add('ativo');
        });

        const fecharMenuFunc = () => {
            if (menuLateral) menuLateral.classList.remove('ativo');
            if (menuOverlay) menuOverlay.classList.remove('ativo');
        };

        safeBind('btnFecharMenu', 'click', fecharMenuFunc);
        safeBind('menuOverlay', 'click', fecharMenuFunc);
        
        const textoInput = document.getElementById('textoProducao');
        const valorInput = document.getElementById('valorUnitario');
        const inputBusca = document.getElementById('inputBusca');
        
        if (textoInput) textoInput.addEventListener('input', () => this.atualizarPreviewTempoReal());
        if (valorInput) valorInput.addEventListener('input', () => this.atualizarPreviewTempoReal());
        
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                this.termoBusca = e.target.value.toLowerCase().trim();
                this.render();
            });
        }
    }
    
    atualizarPreviewTempoReal() {
        const textoEl = document.getElementById('textoProducao');
        const valorEl = document.getElementById('valorUnitario');
        const previewBox = document.getElementById('previewResult');

        if (!textoEl || !previewBox) return;

        const texto = textoEl.value;
        const valorUnitario = parseFloat(valorEl ? valorEl.value : 0) || 0;

        if (!texto.trim()) {
            previewBox.style.display = 'none';
            return;
        }

        const tempLancamento = new LancamentoDia(texto, valorUnitario);

        if (tempLancamento.pecas > 0) {
            const pecasEl = document.getElementById('previewPecas');
            const valorTotalEl = document.getElementById('previewValor');
            if (pecasEl) pecasEl.innerText = tempLancamento.pecas;
            if (valorTotalEl) valorTotalEl.innerText = `R$ ${tempLancamento.valorTotal.toFixed(2)}`;
            previewBox.style.display = 'block';
        } else {
            previewBox.style.display = 'none';
        }
    }

    salvarLancamento() {
        const textoEl = document.getElementById('textoProducao');
        const valorEl = document.getElementById('valorUnitario');
        
        if (!textoEl) return;
        const texto = textoEl.value;
        const valorUnitario = parseFloat(valorEl ? valorEl.value : 0) || 0;

        if (!texto.trim()) {
            alert('Digite a produção do dia.');
            return;
        }

        const lancamento = new LancamentoDia(texto, valorUnitario);
        if (lancamento.pecas === 0) {
            alert('Nenhum número de peças identificado.');
            return;
        }

        this.lancamentosAtuais.push(lancamento);
        localStorage.setItem('temp_lancamentos', JSON.stringify(this.lancamentosAtuais));
        
        this.sincronizadoComNuvem = false;
        localStorage.setItem('sincronizado_nuvem', 'false');

        textoEl.value = '';
        const previewBox = document.getElementById('previewResult');
        if (previewBox) previewBox.style.display = 'none';
        
        this.render();
    }

    removerLancamento(index) {
        if (confirm('Deseja realmente excluir este lançamento?')) {
            this.lancamentosAtuais.splice(index, 1);
            localStorage.setItem('temp_lancamentos', JSON.stringify(this.lancamentosAtuais));
            this.sincronizadoComNuvem = false;
            localStorage.setItem('sincronizado_nuvem', 'false');
            this.render();
        }
    }

    editarLancamento(index) {
        const reg = this.lancamentosAtuais[index];
        if (!reg) return;

        const textoEl = document.getElementById('textoProducao');
        const valorEl = document.getElementById('valorUnitario');

        if (textoEl) textoEl.value = reg.textoBruto || reg.textoOriginal || '';
        if (valorEl && reg.valorUnitario) valorEl.value = reg.valorUnitario;

        this.lancamentosAtuais.splice(index, 1);
        localStorage.setItem('temp_lancamentos', JSON.stringify(this.lancamentosAtuais));
        this.render();
        
        if (textoEl) textoEl.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async fecharSemana() {
        if (this.lancamentosAtuais.length === 0) {
            alert('Não há registros na semana atual.');
            return;
        }

        if (confirm('Deseja fechar esta semana e salvá-la no histórico?')) {
            const semana = new SemanaProducao(this.lancamentosAtuais);
            await this.storage.salvarSemana(semana);

            this.lancamentosAtuais = [];
            localStorage.removeItem('temp_lancamentos');
            this.sincronizadoComNuvem = true;
            localStorage.setItem('sincronizado_nuvem', 'true');
            this.render();
            alert('Semana fechada com sucesso!');
        }
    }

    async obterOuCriarPlanilhaDrive() {
        const nomePlanilha = 'Controle de Travete - Meus Dados';
        
        const query = encodeURIComponent(`name = '${nomePlanilha}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            const idEncontrado = searchData.files[0].id;
            this.spreadsheetIdSalvo = idEncontrado;
            localStorage.setItem('google_spreadsheet_id', idEncontrado);
            return idEncontrado;
        }

        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: { title: nomePlanilha }
            })
        });
        const createData = await createRes.json();
        const spreadsheetId = createData.spreadsheetId;
        
        this.spreadsheetIdSalvo = spreadsheetId;
        localStorage.setItem('google_spreadsheet_id', spreadsheetId);

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Página1!A1:E1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [["Data do Lançamento", "Descrição / Texto Bruto", "Peças", "Valor Unitário", "Valor Total"]]
            })
        });

        return spreadsheetId;
    }

    abrirPlanilhaNoNavegador() {
        if (!this.accessToken) {
            alert('Conecte-se com o Google primeiro para acessar sua planilha.');
            this.fazerLoginGoogle();
            return;
        }

        if (!this.spreadsheetIdSalvo) {
            this.obterOuCriarPlanilhaDrive().then(id => {
                if (id) {
                    window.open(`https://docs.google.com/spreadsheets/d/${id}/edit`, '_blank');
                }
            }).catch(() => {
                alert('Não foi possível localizar sua planilha no Drive. Tente sincronizar primeiro.');
            });
            return;
        }

        window.open(`https://docs.google.com/spreadsheets/d/${this.spreadsheetIdSalvo}/edit`, '_blank');
    }

    async enviarParaGoogleSheetsAutomatico() {
        if (!this.accessToken) {
            alert('Por favor, clique em "Entrar com o Google" antes de sincronizar.');
            this.fazerLoginGoogle();
            return;
        }

        if (this.lancamentosAtuais.length === 0) {
            alert('Não há lançamentos atuais na tela para sincronizar.');
            return;
        }

        const btnNuvem = document.getElementById('btnEnviarNuvem');
        try {
            if (btnNuvem) btnNuvem.innerText = "Sincronizando com o Drive...";

            const spreadsheetId = await this.obterOuCriarPlanilhaDrive();

            const linhasNovas = this.lancamentosAtuais.map(reg => [
                reg.data || new Date().toLocaleDateString('pt-BR'),
                reg.textoBruto || reg.textoOriginal || '',
                reg.pecas || 0,
                reg.valorUnitario || 0,
                reg.valorTotal || 0
            ]);

            const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Página1!A:E:append?valueInputOption=USER_ENTERED`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: linhasNovas
                })
            });

            if (!appendRes.ok) {
                throw new Error('Falha ao gravar dados na planilha.');
            }

            this.sincronizadoComNuvem = true;
            localStorage.setItem('sincronizado_nuvem', 'true');
            this.render();

            alert("Sincronizado com sucesso! Seus lançamentos foram enviados para a planilha 'Controle de Travete - Meus Dados'.");
        } catch (e) {
            console.error(e);
            if (e.message.includes('401') || e.message.includes('expired')) {
                localStorage.removeItem('google_access_token');
                this.accessToken = null;
                this.atualizarInterfaceLogin(false);
                alert('Sua sessão expirou. Por favor, entre com o Google novamente.');
            } else {
                alert('Erro ao sincronizar com o Google Drive. Verifique sua conexão.');
            }
        } finally {
            if (btnNuvem) btnNuvem.innerText = "🚀 Sincronizar com o Drive";
        }
    }

    async render() {
        const listaAtualEl = document.getElementById('listaHistorico');
        let totalPecas = 0;
        let totalValor = 0;

        if (listaAtualEl) {
            let htmlAtuais = '';
            this.lancamentosAtuais.forEach((reg, index) => {
                const textoBuscaRef = (reg.textoBruto || reg.textoOriginal || '').toLowerCase();
                const dataRef = (reg.data || '').toLowerCase();

                if (this.termoBusca && !dataRef.includes(this.termoBusca) && !textoBuscaRef.includes(this.termoBusca)) {
                    return;
                }
                totalPecas += reg.pecas || 0;
                totalValor += reg.valorTotal || 0;

                const detalhesList = reg.detalhes ? reg.detalhes.map(d => `<li>${d}</li>`).join('') : '';

                htmlAtuais += `
                    <div class="history-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="flex: 1; margin-right: 8px;">
                            <strong>${reg.data}</strong> - ${reg.pecas} pçs (R$ ${reg.valorTotal.toFixed(2)})
                            <ul>${detalhesList}</ul>
                        </div>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="window.app.editarLancamento(${index})" title="Editar Lançamento" style="width: auto; padding: 6px 8px; background: transparent; color: #ff9800; font-size: 0.9rem; margin: 0; cursor: pointer; border: none;">✏️</button>
                            <button onclick="window.app.removerLancamento(${index})" title="Excluir Lançamento" style="width: auto; padding: 6px 8px; background: transparent; color: #ff5555; font-size: 0.9rem; margin: 0; cursor: pointer; border: none;">🗑️</button>
                        </div>
                    </div>
                `;
            });
            listaAtualEl.innerHTML = htmlAtuais || '<p style="color: #888; text-align: center; font-size: 0.9rem;">Nenhum lançamento na semana atual.</p>';
        }

        const totalGeralValorEl = document.getElementById('totalGeralValor');
        const totalGeralPecasEl = document.getElementById('totalGeralPecas');
        if (totalGeralValorEl) totalGeralValorEl.innerText = `R$ ${totalValor.toFixed(2)}`;
        if (totalGeralPecasEl) totalGeralPecasEl.innerText = totalPecas;

        // Gerenciamento dos avisos e botões de Drive dentro do Menu Lateral
        const containerMenuSync = document.getElementById('cardSincronizacaoMenu');
        if (containerMenuSync) {
            let avisoEl = document.getElementById('avisoSyncPendenteMenu');
            if (!this.sincronizadoComNuvem && this.lancamentosAtuais.length > 0) {
                if (!avisoEl) {
                    avisoEl = document.createElement('div');
                    avisoEl.id = 'avisoSyncPendenteMenu';
                    avisoEl.style.cssText = 'background: rgba(255, 152, 0, 0.15); color: #ff9800; padding: 8px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 10px; text-align: center; border: 1px solid #ff9800;';
                    containerMenuSync.prepend(avisoEl);
                }
                avisoEl.innerText = '⚠️ Há lançamentos pendentes de sincronização.';
            } else if (avisoEl) {
                avisoEl.remove();
            }

            let btnAbrirPlanilha = document.getElementById('btnAbrirPlanilhaDrive');
            if (this.accessToken) {
                if (!btnAbrirPlanilha) {
                    btnAbrirPlanilha = document.createElement('button');
                    btnAbrirPlanilha.id = 'btnAbrirPlanilhaDrive';
                    btnAbrirPlanilha.className = 'btn-backup';
                    btnAbrirPlanilha.style.cssText = 'background-color: #34a853; color: white; font-weight: bold; width: 100%; margin-top: 8px;';
                    btnAbrirPlanilha.innerHTML = '📊 Ver Planilha no Google Drive';
                    btnAbrirPlanilha.onclick = () => window.app.abrirPlanilhaNoNavegador();
                    containerMenuSync.appendChild(btnAbrirPlanilha);
                }
            } else if (btnAbrirPlanilha) {
                btnAbrirPlanilha.remove();
            }
        }

        const historicoEl = document.getElementById('listaArquivo');
        if (!historicoEl) return;

        const semanasSalvas = await this.storage.obterTodasSemanas();
        let htmlHistorico = '';
        
        // --- Cálculo de Resumo Mensal ---
        const resumoMensal = {};
        semanasSalvas.forEach(semana => {
            const partesPeriodo = semana.periodo ? semana.periodo.split(' ') : [];
            let mesAnoKey = 'Outros';
            if (partesPeriodo.length > 0) {
                const dataInicioStr = partesPeriodo[0];
                const subPartes = dataInicioStr.split('/');
                if (subPartes.length === 3) {
                    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    const mesIndex = parseInt(subPartes[1], 10) - 1;
                    if (mesesNomes[mesIndex]) {
                        mesAnoKey = `${mesesNomes[mesIndex]} de ${subPartes[2]}`;
                    }
                }
            }

            if (!resumoMensal[mesAnoKey]) {
                resumoMensal[mesAnoKey] = { valor: 0, pecas: 0, semanasCount: 0 };
            }
            resumoMensal[mesAnoKey].valor += semana.valorTotal || 0;
            resumoMensal[mesAnoKey].pecas += semana.pecasTotal || 0;
            resumoMensal[mesAnoKey].semanasCount += 1;
        });

        let htmlResumoMensal = '';
        Object.keys(resumoMensal).forEach(mes => {
            const dados = resumoMensal[mes];
            htmlResumoMensal += `
                <div style="background: rgba(33, 150, 243, 0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
                    <div>
                        <strong style="color: var(--info-color);">${mes}</strong>
                        <div style="font-size: 0.75rem; color: #aaa;">${dados.semanasCount} semana(s) fechada(s)</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--accent-color); font-weight: bold;">R$ ${dados.valor.toFixed(2)}</span>
                        <div style="font-size: 0.75rem; color: #ccc;">${dados.pecas} pçs</div>
                    </div>
                </div>
            `;
        });

        if (htmlResumoMensal) {
            htmlHistorico += `
                <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: #bbb;">📊 Resumo por Mês</h4>
                    ${htmlResumoMensal}
                </div>
            `;
        }

        semanasSalvas.sort((a, b) => b.id - a.id).forEach(semana => {
            const semObj = new SemanaProducao(semana.registros);
            semObj.periodo = semana.periodo;
            semObj.pecasTotal = semana.pecasTotal;
            semObj.valorTotal = semana.valorTotal;

            let itensDetalhadosHtml = '';
            semana.registros.forEach(reg => {
                const valorReg = reg.valorTotal || (reg.pecas * (reg.valorUnitario || 0.21));
                const infoPreco = reg.valorUnitario ? `<small style="color: #aaa;">(R$ ${reg.valorUnitario.toFixed(2)} un)</small>` : '';
                const detalhesList = reg.detalhes ? reg.detalhes.map(d => `<li style="font-size: 0.85rem; color: #ccc;">${d}</li>`).join('') : '';
                
                itensDetalhadosHtml += `
                    <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                            <span><strong>${reg.data}</strong> - ${reg.pecas} pçs ${infoPreco}</span>
                            <span style="color: var(--accent-color);">R$ ${valorReg.toFixed(2)}</span>
                        </div>
                        <ul style="margin: 2px 0 0 15px; padding: 0;">${detalhesList}</ul>
                    </div>
                `;
            });

            htmlHistorico += `
                <div class="archive-box">
                    <details>
                        <summary style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold; outline: none; font-size: 0.95rem;">
                            <span>📅 ${semObj.periodo}</span>
                            <span style="color: var(--accent-color);">R$ ${semObj.valorTotal.toFixed(2)} (${semObj.pecasTotal} pçs)</span>
                        </summary>
                        <div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 8px;">
                            ${itensDetalhadosHtml}
                            <button class="btn-whatsapp" onclick="window.open('https://api.whatsapp.com/send?text=${encodeURIComponent(semObj.gerarMensagemWhatsApp())}', '_blank')">
                                📲 Enviar por WhatsApp
                            </button>
                        </div>
                    </details>
                </div>
            `;
        });

        const cardArquivo = document.getElementById('cardArquivo');
        if (cardArquivo) {
            cardArquivo.style.display = semanasSalvas.length ? 'block' : 'none';
        }
        historicoEl.innerHTML = htmlHistorico;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AppController());
} else {
    new AppController();
}
