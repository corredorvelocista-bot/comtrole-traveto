import { StorageService } from './StorageService.js';
import { LancamentoDia, SemanaProducao } from './Producao.js';

class AppController {
    constructor() {
        this.storage = new StorageService();
        this.lancamentosAtuais = JSON.parse(localStorage.getItem('temp_lancamentos')) || [];
        this.termoBusca = '';
        
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
                this.atualizarInterfaceLogin(false);
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

    tocarSom() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
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
        
        this.tocarSom();
        textoEl.value = '';
        const previewBox = document.getElementById('previewResult');
        if (previewBox) previewBox.style.display = 'none';
        
        this.render();
    }

    removerLancamento(index) {
        if (confirm('Deseja realmente excluir este lançamento?')) {
            this.lancamentosAtuais.splice(index, 1);
            localStorage.setItem('temp_lancamentos', JSON.stringify(this.lancamentosAtuais));
            this.render();
        }
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
            return searchData.files[0].id;
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

            alert("Sincronizado com sucesso! Seus lançamentos foram organizados linha por linha na planilha 'Controle de Travete - Meus Dados'.");
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
            if (btnNuvem) btnNuvem.innerText = "🚀 Sincronizar Agora com o Google Drive";
        }
    }

    async render() {
        const listaAtualEl = document.getElementById('listaHistorico');
        let totalPecas = 0;
        let totalValor = 0;

        if (listaAtualEl) {
            let htmlAtuais = '';
            this.lancamentosAtuais.forEach((reg, index) => {
                if (this.termoBusca && !reg.data.toLowerCase().includes(this.termoBusca) && !reg.textoOriginal.toLowerCase().includes(this.termoBusca)) {
                    return;
                }
                totalPecas += reg.pecas || 0;
                totalValor += reg.valorTotal || 0;

                const detalhesList = reg.detalhes ? reg.detalhes.map(d => `<li>${d}</li>`).join('') : '';

                htmlAtuais += `
                    <div class="history-item">
                        <div>
                            <strong>${reg.data}</strong> - ${reg.pecas} pçs (R$ ${reg.valorTotal.toFixed(2)})
                            <ul>${detalhesList}</ul>
                        </div>
                        <button onclick="window.app.removerLancamento(${index})" style="width: auto; padding: 4px 8px; background: transparent; color: #ff5555; font-size: 0.9rem; margin: 0; cursor: pointer;">🗑️</button>
                    </div>
                `;
            });
            listaAtualEl.innerHTML = htmlAtuais || '<p style="color: #888; text-align: center; font-size: 0.9rem;">Nenhum lançamento na semana atual.</p>';
        }

        const totalGeralValorEl = document.getElementById('totalGeralValor');
        const totalGeralPecasEl = document.getElementById('totalGeralPecas');
        if (totalGeralValorEl) totalGeralValorEl.innerText = `R$ ${totalValor.toFixed(2)}`;
        if (totalGeralPecasEl) totalGeralPecasEl.innerText = totalPecas;

        const historicoEl = document.getElementById('listaArquivo');
        if (!historicoEl) return;

        const semanasSalvas = await this.storage.obterTodasSemanas();
        let htmlHistorico = '';
        
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
