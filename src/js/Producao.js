export class LancamentoDia {
    constructor(texto, valorUnitario = 0.21) {
        this.dataCompleta = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        this.textoOriginal = texto.trim();
        this.valorUnitario = valorUnitario;
        this.pecas = this.extrairPecas(texto);
        this.detalhes = this.extrairDetalhes(texto);
        this.valorTotal = this.pecas * this.valorUnitario;
        this.data = this.extrairDataOuHoje(texto);
    }

    extrairPecas(texto) {
        // Tenta achar o primeiro número isolado no texto
        const match = texto.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    extrairDetalhes(texto) {
        // Quebra linhas ou usa o texto como detalhe descritivo
        return texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }

    extrairDataOuHoje(texto) {
        // Se houver menção de data no formato DD/MM, extrai, senão usa a data atual
        const matchData = texto.match(/(\d{2}\/\d{2})/);
        return matchData ? matchData[1] : this.dataCompleta;
    }
}

export class SemanaProducao {
    constructor(registros = []) {
        this.id = Date.now();
        this.registros = registros;
        this.periodo = this.calcularPeriodo(registros);
        this.pecasTotal = registros.reduce((acc, reg) => acc + (reg.pecas || 0), 0);
        this.valorTotal = registros.reduce((acc, reg) => acc + (reg.valorTotal || 0), 0);
    }

    calcularPeriodo(registros) {
        if (!registros || registros.length === 0) return 'Semana Atual';
        const primeira = registros[0].data;
        const ultima = registros[registros.length - 1].data;
        return primeira === ultima ? `${primeira}` : `${primeira} a ${ultima}`;
    }

    gerarMensagemWhatsApp() {
        let msg = `*Relatório de Produção - Travete*\n`;
        msg += `📅 Período: ${this.periodo}\n\n`;
        
        this.registros.forEach(reg => {
            msg += `• *${reg.data}*: ${reg.pecas} pçs - R$ ${reg.valorTotal.toFixed(2)}\n`;
            if (reg.detalhes && reg.detalhes.length > 0) {
                reg.detalhes.forEach(d => {
                    msg += `   _(${d})_\n`;
                });
            }
        });

        msg += `\n------------------\n`;
        msg += `🔢 *Total de Peças:* ${this.pecasTotal} pçs\n`;
        msg += `💰 *Valor Total:* R$ ${this.valorTotal.toFixed(2)}`;
        
        return msg;
    }
}
