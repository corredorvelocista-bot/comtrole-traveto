/**
 * Utilitário para destravar itens que falharam por conflito no localStorage.
 */
export function destravamentoFilaLocal() {
    const CHAVE_FILA = 'anotei_fila_sincronizacao_v1';
    try {
        const raw = localStorage.getItem(CHAVE_FILA);
        if (!raw) return;
        
        let fila = JSON.parse(raw);
        if (!Array.isArray(fila)) return;

        let alterado = false;
        fila = fila.map(item => {
            if (item.bloqueado) {
                delete item.bloqueado;
                delete item.motivoBloqueio;
                item.tentativas = 0;
                alterado = true;
            }
            return item;
        });

        if (alterado) {
            localStorage.setItem(CHAVE_FILA, JSON.stringify(fila));
            console.log('[Anotei Sync] Fila local destravada com sucesso.');
        }
    } catch (e) {
        console.error('[Anotei Sync] Erro ao limpar fila local:', e);
    }
}
