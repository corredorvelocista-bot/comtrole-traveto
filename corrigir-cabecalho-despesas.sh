#!/usr/bin/env bash
set -euo pipefail

# Corrige somente o estilo do cabeçalho da página Despesas.
# Não altera JavaScript, serviços, cálculos nem armazenamento de dados.

PROJETO="${1:-$HOME/Documentos/anotei}"
HTML="$PROJETO/despesas-pessoais.html"
CSS_DIR="$PROJETO/src/css"
CSS="$CSS_DIR/despesas-cabecalho-padrao.css"

if [[ ! -f "$HTML" ]]; then
  echo "ERRO: não encontrei $HTML" >&2
  echo "Uso: bash $0 /caminho/para/anotei" >&2
  exit 1
fi
if [[ ! -d "$CSS_DIR" ]]; then
  echo "ERRO: não encontrei a pasta $CSS_DIR" >&2
  exit 1
fi
if ! grep -q 'class="app-header"' "$HTML" || ! grep -q 'financeiro-despesas-page' "$HTML"; then
  echo "ERRO: a estrutura esperada do cabeçalho de Despesas não foi encontrada." >&2
  echo "Nenhum arquivo foi alterado. Confira se esta é a versão correta do projeto." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp -p "$HTML" "$HTML.bak-cabecalho-$STAMP"
if [[ -f "$CSS" ]]; then
  cp -p "$CSS" "$CSS.bak-$STAMP"
fi

cat > "$CSS" <<'CSS_EOF'
/* Ajuste isolado: cabeçalho de Despesas no mesmo padrão de Gestão Financeira. */
body .financeiro-despesas-page .financeiro-despesas-header > .app-header {
    display: flex;
    align-items: center;
    gap: 18px;
    margin: 0 0 28px;
    padding: 8px 0 22px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid #ece9f4;
    border-radius: 0;
    box-shadow: none;
}

body .financeiro-despesas-page .financeiro-despesas-header .app-header-titles {
    min-width: 0;
}

body .financeiro-despesas-page .financeiro-despesas-header .app-header h1 {
    margin: 0;
    color: #211d35;
    font-size: clamp(1.65rem, 3vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1.2;
}

body .financeiro-despesas-page .financeiro-despesas-header .app-header p {
    margin: 8px 0 0;
    color: #77748a;
    font-size: 0.95rem;
    line-height: 1.5;
    opacity: 1;
}

body .financeiro-despesas-page .financeiro-despesas-header #btnVoltarGestaoFinanceira,
body .financeiro-despesas-page .financeiro-despesas-header #btnVoltarProducao {
    flex: 0 0 auto;
    box-sizing: border-box;
}

@media (max-width: 600px) {
    body .financeiro-despesas-page .financeiro-despesas-header > .app-header {
        gap: 12px;
        padding-bottom: 18px;
        margin-bottom: 22px;
    }

    body .financeiro-despesas-page .financeiro-despesas-header .app-header h1 {
        font-size: 1.65rem;
    }
}
CSS_EOF

# Inclui a folha CSS apenas na página Despesas, de forma idempotente.
if ! grep -q 'despesas-cabecalho-padrao.css' "$HTML"; then
  python3 - "$HTML" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text(encoding='utf-8')
needle = '</head>'
link = '    <link rel="stylesheet" href="./src/css/despesas-cabecalho-padrao.css">\n'
if needle not in s:
    raise SystemExit('ERRO: </head> não encontrado; HTML não foi alterado.')
s = s.replace(needle, link + needle, 1)
p.write_text(s, encoding='utf-8')
PY
fi

echo "Concluído: apenas o cabeçalho visual de Despesas recebeu o ajuste."
echo "Backup do HTML: $HTML.bak-cabecalho-$STAMP"
if [[ -f "$CSS.bak-$STAMP" ]]; then
  echo "Backup do CSS anterior: $CSS.bak-$STAMP"
fi
echo "Nenhum arquivo JavaScript foi modificado."
