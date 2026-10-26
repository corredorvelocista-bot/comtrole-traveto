#!/usr/bin/env bash
set -Eeuo pipefail

APP="src/js/app.js"
test -f "$APP" || { echo "ERRO: $APP não encontrado."; exit 1; }

if grep -q 'ANOTEI_SYNC_AUTOMATICA_V2' "$APP"; then
    echo "A versão V2 já está instalada."
    exit 0
fi

BACKUP="backup-sync-v2-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/src/js"
cp -p "$APP" "$BACKUP/src/js/app.js"

python3 - <<'PY'
from pathlib import Path

p = Path("src/js/app.js")
s = p.read_text(encoding="utf-8")

marcador = "ANOTEI_SYNC_AUTOMATICA_V2"
if marcador in s:
    raise SystemExit("A versão V2 já existe.")

alvo = "        this.carregarLancamentosRemotos();"
if s.count(alvo) != 1:
    raise SystemExit(
        "Esperava encontrar exatamente uma chamada a "
        "this.carregarLancamentosRemotos();. "
        "Arquivo preservado."
    )

s = s.replace(
    alvo,
    alvo + """
        // ANOTEI_SYNC_AUTOMATICA_V2
        this.iniciarAtualizacaoAutomatica();
""",
    1
)

fim = s.rfind("\\n} // <--- FECHAMENTO DA CLASSE APPCONTROLLER")
if fim < 0:
    raise SystemExit(
        "Não encontrei o fechamento esperado da classe. "
        "Arquivo preservado."
    )

metodo = r'''

    // ANOTEI_SYNC_AUTOMATICA_V2
    iniciarAtualizacaoAutomatica() {
        if (this._anoteiSyncTimer) return;

        this._anoteiSyncEmAndamento = false;

        const atualizar = async () => {
            if (this._anoteiSyncEmAndamento) return;
            if (document.visibilityState !== 'visible') return;
            if (!navigator.onLine || !supabaseConfigurado) return;

            this._anoteiSyncEmAndamento = true;
            try {
                await this.carregarLancamentosRemotos();
            } catch (erro) {
                console.error(
                    '[Anotei Sync] Erro na atualização automática:',
                    erro
                );
            } finally {
                this._anoteiSyncEmAndamento = false;
            }
        };

        this._anoteiSyncTimer =
            window.setInterval(atualizar, 3000);

        window.addEventListener('online', atualizar);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') atualizar();
        });
    }
'''

s = s[:fim] + metodo + s[fim:]
p.write_text(s, encoding="utf-8")
print("Atualização periódica instalada no AppController.")
PY

node --check "$APP"
echo "Backup: $BACKUP"
echo "Recarregue os dois navegadores para testar."
