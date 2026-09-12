export class LancamentoDia {
    constructor(texto, valorUnitario) {
        this.id = Date.now();
        this.data = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        this.textoBruto = texto;
        this.valorUnitario = valorUnitario;
        this.pecas = 0;
        this.valorTotal = 0;
        this.detalhes = [];
        this._processarTexto(texto);
    }

    _processarTexto(texto) {
        const linhas = texto.split('\n');
        linhas.forEach(linha => {
            const numeroMatch = linha.match(/\d+/);
            if (numeroMatch) {
                const qtd = parseInt(numeroMatch[0], 10);
                this.pecas += qtd;
                this.detalhes.push(linha.trim());
            }
        });
        this.valorTotal = this.pecas * this.valorUnitario;
    }
}

export class SemanaProducao {
    constructor(registros = []) {
        this.id = Date.now();
        this.registros = registros;
        this.pecasTotal = 0;
        this.valorTotal = 0;
        this.periodo = this._calcularPeriodo();
        this._calcularTotais();
    }

    _calcularTotais() {
        this.registros.forEach(item => {
            this.pecasTotal += item.pecas;
            this.valorTotal += item.valorTotal;
        });
    }

    _calcularPeriodo() {
        if (this.registros.length === 0) return "Semana vazia";
        const primeira = this.registros[0].data;
        const ultima = this.registros[this.registros.length - 1].data;
        return `${primeira} até ${ultima}`;
    }

    gerarMensagemWhatsApp() {
        let texto = `📋 *FECHAMENTO DE PRODUÇÃO*\n`;
        texto += `📅 *Período:* ${this.periodo}\n`;
        texto += `🔢 *Total de Peças:* ${this.pecasTotal} pçs\n`;
        texto += `💰 *Valor Total:* R$ ${this.valorTotal.toFixed(2)}\n\n`;
        texto += `*Lançamentos:* \n`;

        this.registros.forEach(item => {
            texto += `• *${item.data}* (${item.pecas} pçs - R$ ${item.valorTotal.toFixed(2)})\n`;
            item.detalhes.forEach(d => {
                texto += `   - ${d}\n`;
            });
        });

        return encodeURIComponent(texto);
    }
}
