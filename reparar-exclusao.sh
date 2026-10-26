#!/usr/bin/env bash
set -Eeuo pipefail

ARQUIVO="src/js/SupabaseRelacionalService.js"
test -f "$ARQUIVO" || {
    echo "ERRO: arquivo não encontrado: $ARQUIVO"
    exit 1
}

BACKUP="backup-exclusao-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/src/js"
cp -p "$ARQUIVO" "$BACKUP/src/js/"

python3 - <<'PY'
from pathlib import Path
import re
import sys

p = Path("src/js/SupabaseRelacionalService.js")
s = p.read_text(encoding="utf-8")

padrao = re.compile(
    r"  async excluirLancamentoPorOrigem\(idOrigem\)\s*\{.*?\n  \}",
    re.S
)

novo = """  async excluirLancamentoPorOrigem(idOrigem) {
    const client = this.exigirCliente();
    const user = await this.obterUsuarioAtual();

    if (
      idOrigem === undefined ||
      idOrigem === null ||
      String(idOrigem).trim() === ''
    ) {
      throw new TypeError('ID de origem do lançamento inválido.');
    }

    const { error } = await client
      .from('lancamentos_producao')
      .delete()
      .eq('usuario_id', user.id)
      .eq('id_origem', String(idOrigem));

    if (error) throw error;
    return true;
  }"""

if padrao.search(s):
    s = padrao.sub(lambda _: novo, s, count=1)
    p.write_text(s, encoding="utf-8")
    print("Método de exclusão remota corrigido.")
else:
    print(
        "O método excluirLancamentoPorOrigem não foi encontrado. "
        "O arquivo não foi alterado."
    )
    sys.exit(1)
PY

node --check "$ARQUIVO"
echo "Backup criado em: $BACKUP"
echo "Agora teste a exclusão de um lançamento de teste."
