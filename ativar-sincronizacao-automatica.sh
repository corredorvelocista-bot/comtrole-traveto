#!/usr/bin/env bash
set -Eeuo pipefail

APP="src/js/app.js"
SERVICE="src/js/SupabaseRelacionalService.js"

test -f "$APP" || { echo "ERRO: $APP não encontrado."; exit 1; }
test -f "$SERVICE" || { echo "ERRO: $SERVICE não encontrado."; exit 1; }

if grep -q 'ANOTEI_SYNC_AUTOMATICA_V1' "$APP"; then
  echo "A atualização automática já foi instalada."
  exit 0
fi

BACKUP="backup-sync-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/src/js"
cp -p "$APP" "$SERVICE" "$BACKUP/src/js/"

python3 - <<'PY'
from pathlib import Path

p = Path("src/js/app.js")
s = p.read_text(encoding="utf-8")

marcador = "ANOTEI_SYNC_AUTOMATICA_V1"
if marcador in s:
    raise SystemExit("Instalação já existente.")

# Insere a instalação no construtor, depois de window.app = this.
alvo = "window.app = this;"
if alvo not in s:
    raise SystemExit(
        "Não encontrei window.app = this; nenhum arquivo foi alterado. "
        "É necessário adaptar o ponto de inicialização."
    )

codigo = """
        // ANOTEI_SYNC_AUTOMATICA_V1
        this.iniciarAtualizacaoAutomatica?.();
"""

s = s.replace(alvo, alvo + codigo, 1)

# Método da classe: consulta novamente os dados remotos periodicamente.
fim_classe = s.rfind("\\n}")
if fim_classe < 0:
    raise SystemExit("Não encontrei o final da classe AppController.")

metodo = r'''

    // ANOTEI_SYNC_AUTOMATICA_V1
    iniciarAtualizacaoAutomatica() {
        if (this._anoteiSyncTimer) return;

        this._anoteiSyncEmAndamento = false;

        const atualizar = async () => {
            if (this._anoteiSyncEmAndamento) return;
            if (document.visibilityState !== 'visible') return;
            if (!navigator.onLine) return;
            if (!supabaseConfigurado) return;

            this._anoteiSyncEmAndamento = true;
            try {
                await this.carregarLancamentosRemotos();
            } catch (erro) {
                console.error(
                    '[Anotei Sync] Falha na atualização automática:',
                    erro
                );
            } finally {
                this._anoteiSyncEmAndamento = false;
            }
        };

        this._anoteiSyncTimer = window.setInterval(atualizar, 3000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') atualizar();
        });

        window.addEventListener('online', atualizar);
        atualizar();
    }
'''

s = s[:fim_classe] + metodo + s[fim_classe:]
p.write_text(s, encoding="utf-8")
print("Atualização periódica instalada.")
PY

echo
echo "Verificando sintaxe..."
node --check "$APP"

echo
echo "Instalação aplicada. Backup: $BACKUP"
echo "Recarregue os dois navegadores para testar."
