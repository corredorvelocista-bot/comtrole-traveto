#!/usr/bin/env bash
set -euo pipefail
PROJETO="${1:-$HOME/Documentos/anotei}"
HTML="$PROJETO/despesas-pessoais.html"
CSS="$PROJETO/src/css/despesas-prototipo.css"
if [[ ! -f "$HTML" || ! -f "$CSS" ]]; then
  echo "ERRO: não encontrei despesas-pessoais.html e src/css/despesas-prototipo.css em: $PROJETO"
  echo "Nenhum arquivo foi alterado."
  exit 1
fi
python3 - "$HTML" "$CSS" <<'PY'
from pathlib import Path
from datetime import datetime
import shutil, sys
hp, cp = map(Path, sys.argv[1:3])
html, css = hp.read_text(encoding="utf-8"), cp.read_text(encoding="utf-8")
topbar = '''<header class="topbar">
  <a class="brand" href="#"><span class="brand-mark">a</span><span>Anotei</span></a>
  <a class="topbar-label" href="./gestao-financeira.html" aria-label="Voltar para Gestão Financeira">Despesas</a>
  <button class="avatar" aria-label="Perfil do usuário">U</button>
</header>

'''
old = '''  <section class="page-heading">
    <div>
      <p class="eyebrow">ORGANIZE SEUS GASTOS</p>
      <h1>Despesas</h1>
      <p class="intro">Cadastre suas contas, acompanhe o que já pagou e veja o que ainda falta.</p>
    </div>
    <button class="primary-button" id="new-expense-btn"><span>＋</span> Nova despesa</button>
  </section>'''
new = '''  <section class="page-heading despesas-page-heading">
    <div class="app-header despesas-app-header">
      <a class="btn-hamburger despesas-back-button" href="./gestao-financeira.html" aria-label="Voltar para Gestão Financeira">←</a>
      <div class="app-header-titles">
        <h1>Despesas</h1>
        <p class="financeiro-subtitulo">Cadastre suas contas, acompanhe o que já pagou e veja o que ainda falta.</p>
      </div>
    </div>
    <button class="primary-button" id="new-expense-btn"><span>＋</span> Nova despesa</button>
  </section>'''
marker = "/* CABEÇALHO DE DESPESAS ALINHADO AO PADRÃO DO ANOTEI */"
if html.count(topbar) != 1:
    raise SystemExit("ERRO: cabeçalho superior diferente do esperado. Nenhum arquivo alterado.")
if html.count(old) != 1:
    raise SystemExit("ERRO: bloco de título diferente do esperado. Nenhum arquivo alterado.")
if 'class="despesas-page"' in html or marker in css:
    raise SystemExit("ERRO: correção já aplicada ou projeto diferente. Nenhum arquivo alterado.")
if '<body>' not in html:
    raise SystemExit("ERRO: tag body esperada não encontrada. Nenhum arquivo alterado.")
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
shutil.copy2(hp, hp.with_name(hp.name + ".bak-header-" + stamp))
shutil.copy2(cp, cp.with_name(cp.name + ".bak-header-" + stamp))
html = html.replace(topbar, "", 1).replace("<body>", '<body class="despesas-page">', 1)
html = html.replace(old, new, 1)
css += '''

/* CABEÇALHO DE DESPESAS ALINHADO AO PADRÃO DO ANOTEI */
body.despesas-page .page { max-width: 1160px; }
body.despesas-page .despesas-page-heading {
  align-items: center; gap: 18px; margin: 20px 0 25px;
}
body.despesas-page .despesas-app-header {
  display: flex; align-items: center; justify-content: flex-start;
  gap: 12px; min-width: 0; margin: 0;
}
body.despesas-page .despesas-app-header .app-header-titles { min-width: 0; }
body.despesas-page .despesas-app-header h1 {
  margin: 0 0 4px; color: var(--text); font-size: 1.5rem;
  font-weight: 750; letter-spacing: normal; line-height: 1.25;
}
body.despesas-page .despesas-app-header .financeiro-subtitulo {
  margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.5;
}
body.despesas-page .despesas-back-button {
  display: flex; flex: 0 0 auto; align-items: center; justify-content: center;
  width: auto; min-width: 48px; min-height: 44px; margin: 0; padding: 10px 16px;
  border: 1px solid var(--border); border-radius: 8px; background: #fff;
  color: var(--text); font-size: 1.4rem; line-height: 1; text-decoration: none;
}
body.despesas-page .despesas-back-button:hover { background: #f5f3fa; }
@media (max-width: 720px) {
  body.despesas-page .despesas-page-heading {
    align-items: flex-start; flex-direction: column; gap: 16px; margin-top: 12px;
  }
  body.despesas-page .despesas-app-header { width: 100%; }
  body.despesas-page .despesas-page-heading > .primary-button { width: 100%; }
}
'''
hp.write_text(html, encoding="utf-8")
cp.write_text(css, encoding="utf-8")
print("OK: alterados apenas o HTML e o CSS da tela Despesas.")
print("Nenhum JavaScript, serviço, armazenamento ou arquivo da Gestão Financeira foi alterado.")
PY
