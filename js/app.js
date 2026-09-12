import { StorageService } from './StorageService.js';
import { LancamentoDia, SemanaProducao } from './Producao.js';

class AppController {
    constructor() {
        this.storage = new StorageService();
        this.lancamentosAtuais = JSON.parse(localStorage.getItem('temp_lancamentos')) || [];
        this.termoBusca = '';
        
        window.app = this; 

        this.initEvents();
        this.render();
    }

    initEvents() {
        document.getElementById('btnSalvar').addEventListener('click', () => this.salvarLancamento());
        document.getElementById('btnFecharSemana').addEventListener('click', () => this.fecharSemana());
        
        // Eventos de Backup e Restauração
        document.getElementById('btnExportar').addEventListener('click', () => this.exportarBackup());
        document.getElementById('btnImportarTrigger').addEventListener('click', () => {
            document.getElementById('inputImportarFile').click();
        });
        document.getElementById('inputImportarFile').addEventListener('change', (e) => this.importarBackup(e));
        
        // Evento do botão de copiar backup gerado visualmente
        const btnCopiar = document.getElementById('btnCopiarBackup');
        if (btnCopiar) {
            btnCopiar.addEventListener('click', () => {
                const textarea = document.getElementById('textoExportadoBackup');
                textarea.select();
                textarea.setSelectionRange(0, 99999); // Para dispositivos móveis
                
                try {
                    document.execCommand('copy');
                    alert('Texto copiado com sucesso!');
                } catch (err) {
                    alert('Erro ao copiar automaticamente. Selecione o texto manualmente.');
                }
            });
        }
        
        const textoInput = document.getElementById('textoProducao');
        const valorInput = document.getElementById('valorUnitario');
        const inputBusca = document.getElementById('inputBusca');
        
        textoInput.addEventListener('input', () => this.atualizarPreviewTempoReal());
        valorInput.addEventListener('input', () => this.atualizarPreviewTempoReal());
        
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                this.termoBusca = e.target.value.toLowerCase().trim();
                this.render();
            });
        }
    }
    
    atualizarPreviewTempoReal() {
        const texto = document.getElementById('textoProducao').value;
        const valorUnitario = parseFloat(document.getElementById('valorUnitario').value) || 0;
        const previewBox = document.getElementById('previewResult');

        if (!texto.trim()) {
            previewBox.style.display = 'none';
            return;
        }

        const tempLancamento = new LancamentoDia(texto, valorUnitario);

        if (tempLancamento.pecas > 0) {
            document.getElementById('previewPecas').innerText = tempLancamento.pecas;
            document.getElementById('previewValor').innerText = `R$ ${tempLancamento.valorTotal.toFixed(2)}`;
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
        const texto = document.getElementById('textoProducao').value;
        const valorUnitario = parseFloat(document.getElementById('valorUnitario').value) || 0;

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
        document.getElementById('textoProducao').value = '';
        document.getElementById('previewResult').style.display = 'none';
        
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

    async exportarBackup() {
    alert('O botão foi clicado com sucesso!');
        try {
            let jsonStr;
            // Tenta usar o método exportarDados do StorageService, se existir
            if (typeof this.storage.exportarDados === 'function') {
                jsonStr = await this.storage.exportarDados();
            } else {
                // Fallback seguro caso o método ainda não esteja implementado no StorageService
                const dadosGerais = {
                    temp_lancamentos: JSON.parse(localStorage.getItem('temp_lancamentos')) || [],
                    semanas: await this.storage.obterTodasSemanas()
                };
                jsonStr = JSON.stringify(dadosGerais, null, 2);
            }
            
            // Exibe a caixa de texto com o JSON gerado direto na tela
            const cardExportacao = document.getElementById('cardAreaExportacao');
            const textarea = document.getElementById('textoExportadoBackup');
            
            if (cardExportacao && textarea) {
                textarea.value = jsonStr;
                cardExportacao.style.display = 'block';
                cardExportacao.scrollIntoView({ behavior: 'smooth' });
            }

            // Tenta copiar automaticamente para a área de transferência
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(jsonStr);
                    alert('Backup gerado e copiado para a área de transferência com sucesso!');
                    return;
                } catch (clipboardErr) {
                    console.warn('Clipboard API bloqueada, usando textarea visível.');
                }
            }

            alert('Backup gerado abaixo na tela! Copie o texto exibido.');
        } catch (e) {
            console.error('Erro ao exportar backup:', e);
            alert('Não foi possível gerar os dados de backup. Erro: ' + e.message);
        }
    }

    async importarBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const conteudo = e.target.result;
            const sucesso = await this.storage.importarDados(conteudo);
            if (sucesso) {
                this.lancamentosAtuais = JSON.parse(localStorage.getItem('temp_lancamentos')) || [];
                this.render();
                alert('Backup restaurado com sucesso!');
            } else {
                alert('Erro ao restaurar o arquivo de backup. Verifique se o formato está correto.');
            }
            event.target.value = ''; 
        };
        reader.readAsText(file);
    }

    async render() {
        const listaEl = document.getElementById('listaHistorico');
        let htmlAtual = '';
        let totalPcs = 0;
        let totalVal = 0;

        this.lancamentosAtuais.forEach((item, index) => {
            totalPcs += item.pecas;
            totalVal += item.valorTotal;

            const textoBruto = (item.textoBruto || '').toLowerCase();
            const detalhesStr = item.detalhes ? item.detalhes.join(' ').toLowerCase() : '';
            
            const matchBusca = this.termoBusca === '' || 
                textoBruto.includes(this.termoBusca) || 
                detalhesStr.includes(this.termoBusca);

            if (matchBusca) {
                htmlAtual += `
                    <div class="history-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="flex: 1;">
                            <strong>${item.data}</strong> - ${item.pecas} pçs
                            <ul>${item.detalhes.map(d => `<li>${d}</li>`).join('')}</ul>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="color: var(--accent-color); font-weight: bold;">R$ ${item.valorTotal.toFixed(2)}</div>
                            <button onclick="window.app.removerLancamento(${index})" style="background: none; border: none; color: #ff5252; cursor: pointer; font-size: 1.1rem; padding: 0;" title="Excluir lançamento">🗑️</button>
                        </div>
                    </div>
                `;
            }
        });

        if (this.lancamentosAtuais.length === 0) {
            listaEl.innerHTML = '<p style="color:#777;">Nenhum lançamento hoje.</p>';
        } else if (htmlAtual === '') {
            listaEl.innerHTML = '<p style="color:#777;">Nenhum resultado encontrado para a busca.</p>';
        } else {
            listaEl.innerHTML = htmlAtual;
        }

        document.getElementById('totalGeralValor').innerText = `R$ ${totalVal.toFixed(2)}`;
        document.getElementById('totalGeralPecas').innerText = totalPcs;

        const historicoEl = document.getElementById('listaArquivo');
        const semanasSalvas = await this.storage.obterTodasSemanas();
        
        let htmlHistorico = '';
        semanasSalvas.sort((a, b) => b.id - a.id).forEach(semana => {
            const semObj = new SemanaProducao(semana.registros);
            semObj.periodo = semana.periodo;
            semObj.pecasTotal = semana.pecasTotal;
            semObj.valorTotal = semana.valorTotal;

            htmlHistorico += `
                <div class="archive-box">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>📅 ${semObj.periodo}</span>
                        <span style="color: var(--accent-color);">R$ ${semObj.valorTotal.toFixed(2)} (${semObj.pecasTotal} pçs)</span>
                    </div>
                    <button class="btn-whatsapp" onclick="window.open('https://api.whatsapp.com/send?text=${semObj.gerarMensagemWhatsApp()}', '_blank')">
                        📲 Enviar por WhatsApp
                    </button>
                </div>
            `;
        });

        document.getElementById('cardArquivo').style.display = semanasSalvas.length ? 'block' : 'none';
        historicoEl.innerHTML = htmlHistorico;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new AppController();
});
